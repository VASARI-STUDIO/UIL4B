// Hold glyph batches to verify the transparent waiting state before artwork arrives.
import { test, expect } from './base.js'
import { chooseMenuOption, go, signIn, watch } from './helpers.js'
import { ICONIFY_HOSTS, ICONIFY_STUB_HEADER, answerIconify, isLiveIconify } from './iconify-stub.js'

const PERSONA = 'a designer opening the icon library on a slow connection'

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

  test('a pending glyph is transparent and the class is gone once it has loaded', async ({ page }) => {
    watch(page, PERSONA)

    await page.addInitScript(() => {
      const seen = new WeakSet()
      window.__pendingGlyphs = []
      window.__waitStarted = null
      window.__statusStarted = null
      const sample = (img) => {
        if (seen.has(img) || !img.classList.contains('ig-glyph-pending')) return
        seen.add(img)
        window.__pendingGlyphs.push({
          background: getComputedStyle(img).backgroundColor,
          animation: getComputedStyle(img).animationName,
          loaded: img.complete && img.naturalWidth > 0,
        })
      }
      const scan = (node) => {
        if (node.nodeType !== 1) return
        if (node.tagName === 'IMG') sample(node)
        node.querySelectorAll?.('img.ig-glyph-pending').forEach(sample)
      }
      new MutationObserver((records) => {
        if (window.__waitStarted === null && document.querySelector('.ig-skel,.ig-glyph-wait')) window.__waitStarted = performance.now()
        if (window.__statusStarted === null && document.querySelector('.ig-status[aria-live="polite"]')) window.__statusStarted = performance.now()
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
    expect(alphaOf(waiting)).toBe(0)
    await expect(page.locator('.ig .ic .ig-glyph-wait').first()).toHaveCSS('animation-name', 'none')
    const status = page.locator('.ig-status[aria-live="polite"]', { hasText: 'Loading icons…' })
    await expect(status).toHaveCount(1)
    await expect(status).toBeVisible()
    const delay = await page.evaluate(() => window.__statusStarted - window.__waitStarted)
    expect(delay).toBeGreaterThanOrEqual(580)
    const before = await page.locator('.ig .ic').first().boundingBox()

    release()

    await expect
      .poll(() => page.evaluate(() => window.__pendingGlyphs.length), { timeout: 20_000 })
      .toBeGreaterThan(8)
    const pending = await page.evaluate(() => window.__pendingGlyphs)
    for (const sample of pending) {
      expect(sample.loaded, 'sampled before the image finished loading').toBe(false)
      expect(alphaOf(sample.background), `a pending glyph paints ${sample.background}`)
        .toBe(0)
      expect(sample.animation).toBe('none')
    }

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
    await expect(status).toHaveCount(0)
    const afterBox = await page.locator('.ig .ic').first().boundingBox()
    expect(Math.abs(afterBox.y - before.y)).toBeLessThanOrEqual(2)
    expect(afterBox.height).toBeCloseTo(before.height, 1)
    await page.emulateMedia({ reducedMotion: 'no-preference' })
    await expect(page.locator('.ig .ic img').first()).toHaveCSS('transition-property', 'opacity')
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await expect(page.locator('.ig .ic img').first()).toHaveCSS('transition-property', 'none')
  })
})

test.describe('the icon grid while a coloured pack is still loading', () => {
  test.skip(isLiveIconify(), 'the live API decides how long a glyph takes; this spec controls it')

  test('a pending coloured glyph slot is transparent, and a loaded one is transparent', async ({ page }) => {
    watch(page, PERSONA)
    await signIn(page, { plan: 'pro' })
    await page.emulateMedia({ reducedMotion: 'no-preference' })
    await page.addInitScript(() => {
      window.__flagLoadOpacity = []
      document.addEventListener('load', event => {
        const img = event.target
        if (img.matches?.('.ig-chip img.ig-glyph-pending')) {
          window.__flagLoadOpacity.push(getComputedStyle(img).opacity)
        }
      }, true)
    })
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
    await choosePack(page, 'circle-flags')
    await expect.poll(() => heldRequests, { timeout: 20_000 }).toBeGreaterThan(0)

    const slot = page.locator('.ig .ic .ig-chip.ig-chip--wait').first()
    await expect(slot).toBeVisible({ timeout: 20_000 })
    const waiting = await slot.evaluate((el) => getComputedStyle(el).backgroundColor)
    expect(alphaOf(waiting)).toBe(0)
    await expect(slot).toHaveCSS('animation-name', 'none')

    release()

    // A slot whose glyph has loaded is a transparent slot, not a box.
    const loaded = page.locator('.ig .ic .ig-chip:not(.ig-chip--wait):has(img)').first()
    await expect(loaded).toBeVisible({ timeout: 20_000 })
    const resting = await loaded.evaluate((el) => getComputedStyle(el).backgroundColor)
    expect(alphaOf(resting), `a loaded slot paints ${resting}`).toBe(0)
    await expect(loaded.locator('img')).toHaveCSS('opacity', '1')
    await expect(loaded.locator('img')).toHaveCSS('transition-duration', '0.16s')
    const atLoad = await page.evaluate(() => window.__flagLoadOpacity)
    expect(atLoad.length).toBeGreaterThan(0)
    expect(atLoad.every(opacity => opacity === '0'), 'flags remain hidden until their image load event').toBe(true)
  })
})

// A batch answered with one name under `not_found`. The answer is built from the
// fixture's own (every other name keeps its body), held until the test releases it
// so the waiting state can be seen first.
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

  test('a coloured name listed under not_found stops waiting once the batch returns', async ({ page }) => {
    watch(page, PERSONA)
    await signIn(page, { plan: 'pro' })
    await go(page, '/create/icons')
    await expect(page.locator('.ig .ic').first()).toBeVisible({ timeout: 20_000 })

    const missing = await answerWithMissing(page, 'logos', (names) => names.find((n) => n === 'arrow-kit'))
    await choosePack(page, 'logos')
    const cell = page.locator('.ig .ic[aria-label="Customise arrow-kit"]')
    const slot = cell.locator('.ig-chip')

    // POSITIVE CONTROL. Before the answer the name waits like every other cell, so
    // the absence of the skeleton afterwards is the answer's doing, not the cell's
    // having never been waiting.
    await expect(slot).toHaveClass(/ig-chip--wait/, { timeout: 20_000 })
    await expect.poll(() => missing.requests, { timeout: 20_000 }).toBeGreaterThan(0)
    missing.release()

    // Its neighbours drew their artwork; the missing name did not, and does not wait.
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
    await choosePack(page, 'lucide')
    await expect(page.locator('.ig .ic .ig-glyph-wait').first()).toBeVisible({ timeout: 20_000 })
    await expect.poll(() => missing.requests, { timeout: 20_000 }).toBeGreaterThan(0)
    missing.release()

    await expect(page.locator('.ig .ic img').nth(8)).toBeVisible({ timeout: 20_000 })
    expect(missing.name, 'the answer listed nothing as not found').toBeTruthy()
    const cell = page.locator(`.ig .ic[aria-label="Customise ${missing.name}"]`)
    await expect(cell.locator('.ig-glyph-gone'), 'the missing name has no empty slot').toHaveCount(1)
    await expect(cell.locator('.ig-glyph-wait'), 'the missing name still waits').toHaveCount(0)
    await expect(page.locator('.ig .ic .ig-glyph-wait'), 'something is still waiting after the batch returned').toHaveCount(0)
  })
})

test.describe('the customiser while its artwork is loading', () => {
  test.skip(isLiveIconify(), 'this spec controls when the artwork arrives')

  // What the waiting slot may paint: nothing of its own. No fill, no shadow, no
  // outline, no animation, whatever the motion setting.
  const measureWait = (el) => el.evaluate((node) => {
    const css = getComputedStyle(node)
    const r = node.getBoundingClientRect()
    const stage = node.parentElement.getBoundingClientRect()
    return { background: css.backgroundColor, backgroundImage: css.backgroundImage, shadow: css.boxShadow,
      animation: css.animationName, width: r.width, height: r.height,
      dx: r.x + r.width / 2 - stage.x - stage.width / 2,
      dy: r.y + r.height / 2 - stage.y - stage.height / 2 }
  })
  // Only the artwork the customiser finally shows, never the waiting slot.
  const FINAL_ART = 'img.icust-stage-img:not(.icust-stage-wait)'

  test('a cold coloured preview paints no square while the held artwork loads', async ({ page }) => {
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
      await choosePack(page, 'logos')
      await page.locator('.ig .ic').first().click()
      const stage = page.locator('.icust-stage')
      const placeholder = stage.locator('.icust-stage-wait')
      await expect(placeholder).toBeVisible()
      await expect.poll(() => requests).toBeGreaterThan(0)
      // No grid glyph has arrived for this icon, so the slot is an empty box.
      await expect(stage.locator(FINAL_ART)).toHaveCount(0)
      for (const motion of ['no-preference', 'reduce']) {
        await page.emulateMedia({ reducedMotion: motion })
        const paint = await measureWait(placeholder)
        expect(alphaOf(paint.background), `${motion}: the waiting slot paints a fill`).toBe(0)
        expect(paint.backgroundImage, `${motion}: the waiting slot paints an image`).toBe('none')
        expect(paint.shadow, `${motion}: the waiting slot paints a shadow`).toBe('none')
        expect(paint.animation, `${motion}: the waiting slot animates`).toBe('none')
        expect(paint.width).toBeCloseTo(48, 1)
        expect(paint.height).toBeCloseTo(48, 1)
        expect(Math.abs(paint.dx)).toBeLessThan(1)
        expect(Math.abs(paint.dy)).toBeLessThan(1)
      }
      const status = stage.getByRole('status')
      await expect(status).toHaveText('Loading…')
      // The loading string is clipped for sighted readers but remains announced.
      await expect(status.getByText('Loading…', { exact: true })).toHaveClass('sr-only')
      await expect(status.locator('.sr-only')).toHaveCSS('clip', 'rect(0px, 0px, 0px, 0px)')
      release()
      await expect(stage.locator(FINAL_ART)).toBeVisible()
      await expect.poll(() => stage.locator(FINAL_ART).evaluate(img => img.complete && img.naturalWidth > 0)).toBe(true)
      await expect(placeholder).toHaveCount(0)
      await expect(status).toHaveCount(0)
    } finally { release() }
  })

  test('a cold preview shows the glyph the grid drew, unpainted, until the held artwork arrives', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'no-preference' })
    await signIn(page, { plan: 'pro' })
    await go(page, '/create/icons')
    await expect(page.locator('.ig .ic').first()).toBeVisible()
    let releaseBatch, releaseArt
    const heldBatch = new Promise(resolve => { releaseBatch = resolve })
    const heldArt = new Promise(resolve => { releaseArt = resolve })
    let artRequests = 0
    // Hold the grid's glyph batch and the stage's own fetch, so the customiser opens
    // on a cell that has no glyph yet; then let only the batch through.
    await page.route(u => ICONIFY_HOSTS.includes(u.hostname)
      && /^\/tabler\.json$/.test(u.pathname) && u.search.includes('icons='), async route => {
      await heldBatch
      await route.fallback()
    })
    await page.route(u => ICONIFY_HOSTS.includes(u.hostname) && /^\/tabler\/[^/]+\.svg$/.test(u.pathname), async route => {
      artRequests += 1
      await heldArt
      await route.fallback()
    })
    try {
      await choosePack(page, 'tabler')
      await expect(page.locator('.ig .ic .ig-glyph-wait').first()).toBeVisible()
      await page.locator('.ig .ic').first().click()
      const stage = page.locator('.icust-stage')
      const placeholder = stage.locator('.icust-stage-wait')
      await expect.poll(() => artRequests).toBeGreaterThan(0)

      // Nothing to show yet: an empty, unpainted 48px box, as for any cold stage.
      await expect(placeholder).toHaveCount(1)
      await expect(placeholder).not.toHaveAttribute('src', /./)
      expect((await measureWait(placeholder)).width).toBeCloseTo(48, 1)

      // The grid's glyph lands first. The slot becomes that glyph, still unpainted.
      releaseBatch()
      const glyph = stage.locator('img.icust-stage-wait')
      await expect(glyph).toHaveCount(1)
      await expect(glyph).toHaveAttribute('src', /^data:image\/svg\+xml/)
      await expect(glyph).toHaveAttribute('alt', '')
      await expect(glyph).toHaveAttribute('aria-hidden', 'true')
      await expect(stage.locator(FINAL_ART)).toHaveCount(0)
      await expect(stage.locator('.icust-stage-host svg')).toHaveCount(0)
      const paint = await measureWait(glyph)
      expect(alphaOf(paint.background)).toBe(0)
      expect(paint.shadow).toBe('none')
      expect(paint.animation).toBe('none')
      expect(paint.width).toBeCloseTo(48, 1)
      expect(paint.height).toBeCloseTo(48, 1)
      expect(Math.abs(paint.dx)).toBeLessThan(1)
      expect(Math.abs(paint.dy)).toBeLessThan(1)
      await expect(stage.getByRole('status')).toHaveText('Loading…')

      // The art arrives: the glyph and the message leave together, the art stays.
      releaseArt()
      await expect(stage.locator('.icust-stage-host svg')).toHaveCount(1)
      await expect(placeholder).toHaveCount(0)
      await expect(stage.getByRole('status')).toHaveCount(0)
      await expect(stage.locator('img')).toHaveCount(0)
    } finally { releaseBatch(); releaseArt() }
  })

  test('cached markup opens without a loading frame', async ({ page }) => {
    await signIn(page, { plan: 'pro' })
    await go(page, '/create/icons')
    await choosePack(page, 'logos')
    const cell = page.locator('.ig .ic').first()
    await expect.poll(() => cell.locator('img').evaluate(img => img.complete && img.naturalWidth > 0)).toBe(true)
    await page.evaluate(() => {
      window.__stagePaints = []
      new MutationObserver(() => {
        const stage = document.querySelector('.icust-stage')
        if (stage) window.__stagePaints.push({
          waiting: !!stage.querySelector('.icust-stage-wait, [role="status"]'),
          image: !!stage.querySelector('img[src^="data:"]:not(.icust-stage-wait)'),
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

test('slow catalogues keep the skeleton and loading message until icons arrive', async ({ page }) => {
  test.skip(isLiveIconify(), 'this test controls catalogue arrival times')
  await page.addInitScript(() => {
    window.__sawEmptyIcons = false
    new MutationObserver(() => {
      if (document.querySelector('.pl-empty')?.textContent.includes('No icons to show')) {
        window.__sawEmptyIcons = true
      }
    }).observe(document, { childList: true, subtree: true })
  })
  let release
  const held = new Promise(resolve => { release = resolve })
  let arrivals = 0
  await page.route(u => ICONIFY_HOSTS.includes(u.hostname) && u.pathname === '/collection', async route => {
    await held
    await new Promise(resolve => setTimeout(resolve, 4000))
    arrivals += 1
    await route.fallback()
  })
  try {
    await go(page, '/create/icons')
    await expect(page.locator('.ig-skel')).toHaveCount(60)
    release()
    // Cross the first-page timeout while every catalogue response is held.
    await page.waitForTimeout(3000)
    expect(arrivals).toBe(0)
    await expect(page.locator('.pl-empty')).toHaveCount(0)
    await expect(page.getByText('No icons to show', { exact: true })).toHaveCount(0)
    await expect(page.locator('.ig-skel')).toHaveCount(60)
    await expect(page.locator('.ig-status')).toHaveText('Loading icons\u2026')
    await expect(page.locator('.ig-status')).toBeVisible()
    await expect(page.locator('.ig-skel')).toHaveCount(0, { timeout: 20_000 })
    await expect(page.locator('.ig .ic').first()).toBeVisible()
    expect(await page.evaluate(() => window.__sawEmptyIcons)).toBe(false)
  } finally { release() }
})

test('staggered catalogues keep the signed-out first page intact at 768', async ({ page }) => {
  test.skip(isLiveIconify(), 'this test controls catalogue arrival times')
  await page.setViewportSize({ width: 768, height: 900 })
  let release
  const held = new Promise(resolve => { release = resolve })
  const packs = ['lucide', 'tabler', 'iconoir', 'heroicons', 'ph']
  const arrivals = []
  await page.route(u => ICONIFY_HOSTS.includes(u.hostname) && u.pathname === '/collection', async route => {
    await held
    const pack = new URL(route.request().url()).searchParams.get('prefix')
    const index = packs.indexOf(pack)
    expect(index, 'only signed-out packs are requested').toBeGreaterThanOrEqual(0)
    await new Promise(resolve => setTimeout(resolve, 150 + index * 200))
    arrivals.push(pack)
    await route.fallback()
  })
  try {
    await go(page, '/create/icons')
    await expect(page.locator('.ig-skel')).toHaveCount(60)
    await page.evaluate(() => {
      window.__iconCls = 0
      window.__iconCellCounts = []
      new PerformanceObserver(list => {
        for (const entry of list.getEntries()) {
          if (!entry.hadRecentInput) window.__iconCls += entry.value
        }
      }).observe({ type: 'layout-shift' })
      // Observe every grid change so even a single partial frame is recorded.
      new MutationObserver(() => {
        const grid = document.querySelector('.ig')
        if (grid) window.__iconCellCounts.push(grid.children.length)
      }).observe(document.querySelector('.ig'), { childList: true })
    })
    release()
    await expect(page.locator('.ig-skel')).toHaveCount(0)
    await expect(page.locator('.ig .ic')).toHaveCount(60)
    await expect(page.locator('.ig .ic img').first()).toBeVisible()
    await expect(page.locator('.ig .ig-glyph-wait')).toHaveCount(0)
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))))
    expect(new Set(arrivals).size).toBe(packs.length)
    const counts = await page.evaluate(() => window.__iconCellCounts)
    expect(counts.length, 'the observer recorded the reveal').toBeGreaterThan(0)
    expect(Math.min(...counts), 'no partial grid replaces the 60-cell skeleton').toBeGreaterThanOrEqual(60)
    expect(await page.evaluate(() => window.__iconCls)).toBeLessThanOrEqual(0.1)
  } finally { release() }
})

for (const scheme of ['light', 'dark']) {
  for (const width of [390, 768, 1440]) {
    test.describe('waiting slots in ' + scheme + ' at ' + width, () => {
      test.skip(isLiveIconify(), 'this test holds glyph batches')
      for (const signedIn of [false, true]) {
        test(`the catalogue skeleton matches loaded row spacing ${signedIn ? 'signed in' : 'signed out'}`, async ({ page }) => {
          await page.setViewportSize({ width, height: 900 })
          await page.emulateMedia({ colorScheme: scheme })
          if (signedIn) await signIn(page, { plan: 'pro' })
          if (signedIn && width === 1440) {
            // Keep this measurement on page one even with a short fixture pack.
            await page.addInitScript(() => {
              const NativeObserver = window.IntersectionObserver
              window.IntersectionObserver = class extends NativeObserver {
                observe(target) {
                  if (!target.matches('.ig-sentinel')) super.observe(target)
                }
              }
            })
          }
          let release
          const held = new Promise(resolve => { release = resolve })
          await page.route(u => ICONIFY_HOSTS.includes(u.hostname) && u.pathname === '/collection',
            async route => { await held; await route.fallback() })
          try {
            await go(page, '/create/icons')
            await expect(page.locator('.ig-skel').first()).toBeVisible()
            const before = await page.locator('.ig').evaluate(grid => {
              const cells = [...grid.children]
              const columns = getComputedStyle(grid).gridTemplateColumns.split(' ').length
              const slot = cells[columns].querySelector('.ig-skel-slot').getBoundingClientRect()
              return { columns, count: cells.length, y: slot.y + (slot.height - 24) / 2, height: cells[columns].getBoundingClientRect().height,
                background: getComputedStyle(cells[0].querySelector('.sk')).backgroundColor }
            })
            await expect(page.locator('.ig-skel-glyph')).toHaveCount(0)
            await expect(page.locator('.ig-skel-label')).toHaveCount(before.count)
            const slots = await page.locator('.ig-skel-slot').evaluateAll(els => els.map(el => {
              const css = getComputedStyle(el)
              return { children: el.childElementCount, background: css.backgroundColor,
                image: css.backgroundImage, shadow: css.boxShadow, animation: css.animationName,
                height: el.getBoundingClientRect().height }
            }))
            for (const slot of slots) {
              expect(slot.children).toBe(0)
              expect(alphaOf(slot.background)).toBe(0)
              expect(slot.image).toBe('none')
              expect(slot.shadow).toBe('none')
              expect(slot.animation).toBe('none')
              expect(slot.height).toBe(24)
            }
            await page.evaluate(() => {
              window.__iconCls = 0
              new PerformanceObserver(list => {
                for (const entry of list.getEntries()) {
                  if (!entry.hadRecentInput) window.__iconCls += entry.value
                }
              }).observe({ type: 'layout-shift' })
            })
            expect(before.count).toBeGreaterThanOrEqual(before.columns * 4)
            expect(before.count).toBe(signedIn ? 120 : 60)
            expect(alphaOf(before.background)).toBeCloseTo(0.06, 3)
            release()
            await expect(page.locator('.ig-skel')).toHaveCount(0)
            await expect(page.locator('.ig .ic')).toHaveCount(before.count)
            await expect(page.locator('.ig .ic img').nth(before.columns)).toBeVisible()
            await expect(page.locator('.ig .ig-glyph-wait,.ig .ig-chip--wait')).toHaveCount(0)
            const after = await page.locator('.ig').evaluate((grid, columns) => {
              const cell = grid.children[columns]
              return { y: cell.querySelector('img,svg').getBoundingClientRect().y, height: cell.getBoundingClientRect().height }
            }, before.columns)
            expect(Math.abs(after.y - before.y)).toBeLessThanOrEqual(2)
            expect(after.height).toBeCloseTo(before.height, 1)
            await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))))
            expect(await page.evaluate(() => window.__iconCls)).toBeLessThanOrEqual(0.1)
          } finally { release() }
        })
      }
      test('regular, flags and Groups reserve transparent space', async ({ page }) => {
        await page.setViewportSize({ width, height: 900 })
        await page.emulateMedia({ colorScheme: scheme })
        await signIn(page, { plan: 'pro' })
        let release
        const held = new Promise(resolve => { release = resolve })
        await page.route(
          u => ICONIFY_HOSTS.includes(u.hostname) && /^\/[^/]+\.json$/.test(u.pathname) && u.search.includes('icons='),
          async route => { await held; await route.fallback() },
        )
        try {
          await go(page, '/create/icons')
          const check = async selector => {
            const slots = page.locator(selector)
            await expect(slots.first()).toBeVisible({ timeout: 20000 })
            const paints = await slots.evaluateAll(els => els.map(el => {
              const css = getComputedStyle(el)
              const rect = el.getBoundingClientRect()
              return { bg: css.backgroundColor, animation: css.animationName, width: rect.width, height: rect.height }
            }))
            expect(paints.length).toBeGreaterThan(0)
            for (const paint of paints) {
              expect(paint.bg).toBe('rgba(0, 0, 0, 0)')
              expect(paint.animation).toBe('none')
              expect(paint.width).toBeGreaterThan(0)
              expect(paint.height).toBeGreaterThan(0)
            }
          }
          await check('.ig .ic .ig-glyph-wait')
          await choosePack(page, 'circle-flags')
          await check('.ig .ic .ig-chip--wait')
          await go(page, '/create/icons/groups?group=wayfinding')
          await check('.igp-grid .igp-wait')
          await page.emulateMedia({ reducedMotion: 'no-preference' })
          await page.evaluate(() => {
            window.__groupLoadOpacity = []
            document.addEventListener('load', event => {
              const img = event.target
              if (img.matches?.('.igp-grid img.igp-glyph-pending')) {
                window.__groupLoadOpacity.push(getComputedStyle(img).opacity)
              }
            }, true)
          })
          release()
          const glyph = page.locator('.igp-grid img').first()
          await expect(glyph).toHaveCSS('opacity', '1')
          await expect(glyph).toHaveCSS('transition-property', 'opacity')
          await expect(glyph).toHaveCSS('transition-duration', '0.16s')
          const atLoad = await page.evaluate(() => window.__groupLoadOpacity)
          expect(atLoad.length).toBeGreaterThan(0)
          expect(atLoad.every(opacity => opacity === '0')).toBe(true)
          // The app follows the OS setting live and rewrites html[data-reduced-motion]
          // from a media-query change event, then announces it with
          // vs-appearance-changed. Wait for that announcement before overriding the
          // attribute by hand, or the late rewrite can overwrite the override.
          // Only an announcement carrying the target value counts: a late account
          // sync can announce an unrelated change first. If none arrives in 5 s the
          // wait fails with a clear message instead of hanging to the test timeout.
          const emulateAndSettle = async reducedMotion => {
            await page.evaluate(want => {
              window.__appearanceApplied = new Promise((resolve, reject) => {
                const onChange = e => {
                  if (e.detail?.reducedMotion !== want) return
                  clearTimeout(timer)
                  window.removeEventListener('vs-appearance-changed', onChange)
                  resolve()
                }
                const timer = setTimeout(() => {
                  window.removeEventListener('vs-appearance-changed', onChange)
                  reject(new Error(`vs-appearance-changed with reducedMotion=${want} did not fire within 5 s`))
                }, 5000)
                window.addEventListener('vs-appearance-changed', onChange)
              })
              // A rejection before it is awaited must not count as unhandled.
              window.__appearanceApplied.catch(() => {})
            }, reducedMotion === 'reduce')
            await page.emulateMedia({ reducedMotion })
            await page.evaluate(() => window.__appearanceApplied)
          }
          await emulateAndSettle('reduce')
          await expect(glyph).toHaveCSS('transition-property', 'none')
          await page.evaluate(() => { document.documentElement.dataset.reducedMotion = 'false' })
          await expect(glyph).toHaveCSS('transition-property', 'opacity')
          await emulateAndSettle('no-preference')
          await page.evaluate(() => { document.documentElement.dataset.reducedMotion = 'true' })
          await expect(glyph).toHaveCSS('transition-property', 'none')
        } finally { release() }
      })
    })
  }
}
