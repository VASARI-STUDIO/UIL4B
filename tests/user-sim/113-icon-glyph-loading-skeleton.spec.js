// Hold glyph batches to verify the transparent waiting state before artwork arrives.
import { test, expect } from './base.js'
import { chooseMenuOption, go, signIn, watch } from './helpers.js'
import { ICONIFY_HOSTS, ICONIFY_STUB_HEADER, answerIconify, holdIconHeads, isLiveIconify } from './iconify-stub.js'

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

  test('a mono slot stays the wait box until the batch lands, then every cell is a drawn symbol with no fade', async ({ page }) => {
    watch(page, PERSONA)

    // Mono glyphs are `<svg class="ig-sym"><use href="#icsN"/></svg>` cells of one hidden sprite: there is
    // no image to load, so no pending state and no fade. Each cell is sampled the moment it is inserted.
    await page.addInitScript(() => {
      const seen = new WeakSet()
      window.__symCells = []
      window.__pendingImgs = 0
      window.__waitStarted = null
      window.__statusStarted = null
      const sample = (cell) => {
        if (seen.has(cell)) return
        seen.add(cell)
        const ref = cell.querySelector('use')?.getAttribute('href') || ''
        window.__symCells.push({
          drawn: !!document.querySelector(`#ig-sprite ${ref}`),
          opacity: getComputedStyle(cell).opacity,
          animation: getComputedStyle(cell).animationName,
        })
      }
      const scan = (node) => {
        if (node.nodeType !== 1) return
        if (node.matches('svg.ig-sym')) sample(node)
        node.querySelectorAll?.('svg.ig-sym').forEach(sample)
        if (node.matches('img.ig-glyph-pending') || node.querySelector?.('img.ig-glyph-pending')) window.__pendingImgs += 1
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
    expect(await page.locator('.ig .ic :is(img, svg.ig-sym)').count(), 'no glyph has arrived yet').toBe(0)
    const waiting = await page.locator('.ig .ic .ig-glyph-wait').first()
      .evaluate((el) => getComputedStyle(el).backgroundColor)
    expect(alphaOf(waiting)).toBe(0)
    await expect(page.locator('.ig .ic .ig-glyph-wait').first()).toHaveCSS('animation-name', 'none')
    const status = page.locator('.ig-status[aria-live="polite"]', { hasText: 'Loading icons…' })
    await expect(status).toHaveCount(1)
    await expect(status).toBeVisible()
    const delay = await page.evaluate(() => window.__statusStarted - window.__waitStarted)
    expect(delay).toBeGreaterThanOrEqual(580)
    const before = await page.locator('.ic').first().boundingBox()

    release()

    await expect
      .poll(() => page.evaluate(() => window.__symCells.length), { timeout: 20_000 })
      .toBeGreaterThan(8)
    const inserted = await page.evaluate(() => window.__symCells)
    for (const cell of inserted) {
      expect(cell.drawn, 'a cell was inserted before its symbol was in the sprite').toBe(true)
      expect(cell.opacity, 'a mono glyph starts faded out').toBe('1')
      expect(cell.animation).toBe('none')
    }
    expect(await page.evaluate(() => window.__pendingImgs), 'a mono glyph went through the image pending state').toBe(0)

    // Once the batch has landed nothing is left waiting and every cell draws from the sprite.
    await expect
      .poll(() => page.evaluate(() => ({
        wait: document.querySelectorAll('.ig .ic .ig-glyph-wait').length,
        pending: document.querySelectorAll('.ig .ic img.ig-glyph-pending').length,
      })), { timeout: 20_000 })
      .toEqual({ wait: 0, pending: 0 })
    const after = await page.evaluate(() => {
      const cells = [...document.querySelectorAll('.ig .ic :is(img, svg.ig-sym)')]
      return {
        total: cells.length,
        drawn: cells.filter((c) => c.matches('svg') && document.querySelector(`#ig-sprite ${c.querySelector('use').getAttribute('href')}`)).length,
      }
    })
    expect(after.total, 'the grid drew glyphs').toBeGreaterThan(8)
    expect(after.drawn, 'every default-grid glyph is a symbol the sprite holds').toBe(after.total)
    await expect(status).toHaveCount(0)
    const afterBox = await page.locator('.ic').first().boundingBox()
    expect(Math.abs(afterBox.y - before.y)).toBeLessThanOrEqual(2)
    expect(afterBox.height).toBeCloseTo(before.height, 1)
    // The tile transitions its hover/press properties only, never `all`.
    await expect(page.locator('.ig .ic').first()).toHaveCSS('transition-property', 'background-color, border-color, transform')
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
    // The default page's own glyph batches are still in flight at first paint; let
    // them finish so the held batch below is the one for the chosen pack. The
    // skeleton's cells are .ic too and carry no wait box, so wait for it to go and
    // for real artwork first: otherwise the next line passes before any batch left.
    await expect(page.locator('.ig-skel')).toHaveCount(0, { timeout: 20_000 })
    await expect(page.locator('.ig .ic :is(img, svg.ig-sym)').first()).toBeVisible({ timeout: 20_000 })
    await expect(page.locator('.ig .ig-glyph-wait, .ig .ig-chip--wait')).toHaveCount(0, { timeout: 20_000 })

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
    // The default page's own glyph batches are still in flight at first paint; let
    // them finish so the held batch below is the one for the chosen pack. The
    // skeleton's cells are .ic too and carry no wait box, so wait for it to go and
    // for real artwork first: otherwise the next line passes before any batch left.
    await expect(page.locator('.ig-skel')).toHaveCount(0, { timeout: 20_000 })
    await expect(page.locator('.ig .ic :is(img, svg.ig-sym)').first()).toBeVisible({ timeout: 20_000 })
    await expect(page.locator('.ig .ig-glyph-wait, .ig .ig-chip--wait')).toHaveCount(0, { timeout: 20_000 })

    // By identity, not position: a stray batch from another listing must not
    // supply a name the pack page never shows.
    const missing = await answerWithMissing(page, 'lucide', (names) => names.find((n) => n === 'arrow-right'))
    await choosePack(page, 'lucide')
    await expect(page.locator('.ig .ic .ig-glyph-wait').first()).toBeVisible({ timeout: 20_000 })
    await expect.poll(() => missing.requests, { timeout: 20_000 }).toBeGreaterThan(0)
    missing.release()

    await expect(page.locator('.ig .ic :is(img, svg.ig-sym)').nth(8)).toBeVisible({ timeout: 20_000 })
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
        // The stage draws at the inspection size (112px), whatever the export size.
        expect(paint.width).toBeCloseTo(112, 1)
        expect(paint.height).toBeCloseTo(112, 1)
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

      // Nothing to show yet: an empty, unpainted 112px box (the inspection size), as for any cold stage.
      await expect(placeholder).toHaveCount(1)
      await expect(placeholder).not.toHaveAttribute('src', /./)
      expect((await measureWait(placeholder)).width).toBeCloseTo(112, 1)

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
      expect(paint.width).toBeCloseTo(112, 1)
      expect(paint.height).toBeCloseTo(112, 1)
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

  test('a Phosphor icon whose art arrives after the modal opens never shows the art with a stroke other than its settled one', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'no-preference' })
    await signIn(page, { plan: 'pro' })
    await go(page, '/create/icons')
    await expect(page.locator('.ig .ic').first()).toBeVisible()
    let releaseArt, releaseBatch
    const heldArt = new Promise(resolve => { releaseArt = resolve })
    const heldBatch = new Promise(resolve => { releaseBatch = resolve })
    let artRequests = 0
    // The grid's glyph batch is held too, so the cell has no markup to hand the
    // stage and the art can only arrive after the modal is open.
    await page.route(u => ICONIFY_HOSTS.includes(u.hostname)
      && /^\/ph\.json$/.test(u.pathname) && u.search.includes('icons='), async route => {
      await heldBatch
      await route.fallback()
    })
    // A 256-unit viewBox, as Phosphor draws. Until the art is here the stage has no
    // viewBox to read, so its first stroke value is the 24-unit one; the settled
    // value for this art is a different number. A frame holding both is the fault.
    const ART = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" fill="none" '
      + 'stroke="currentColor"><circle cx="128" cy="128" r="96"/></svg>'
    await page.route(u => ICONIFY_HOSTS.includes(u.hostname) && /^\/ph\/[^/]+\.svg$/.test(u.pathname), async route => {
      artRequests += 1
      await heldArt
      await route.fulfill({
        status: 200, contentType: 'image/svg+xml; charset=utf-8',
        headers: { 'access-control-allow-origin': '*', [ICONIFY_STUB_HEADER]: '1' }, body: ART,
      })
    })
    try {
      await choosePack(page, 'ph')
      await page.locator('.ig .ic').first().click()
      const stage = page.locator('.icust-stage')
      await expect.poll(() => artRequests).toBeGreaterThan(0)
      await expect(stage.locator('.icust-stage-host svg')).toHaveCount(0)

      // Sample the stage's stroke variable on every frame, and again the instant
      // art lands in the host (before any later task could set it right).
      await page.evaluate(() => {
        const stageEl = document.querySelector('.icust-stage')
        const hostEl = stageEl.querySelector('.icust-stage-host')
        const read = () => ({
          art: !!hostEl.querySelector('svg'),
          stroke: stageEl.style.getPropertyValue('--ig-stroke'),
        })
        window.__strokeFrames = []
        window.__strokeAtInjection = []
        const tick = () => { window.__strokeFrames.push(read()); requestAnimationFrame(tick) }
        requestAnimationFrame(tick)
        new MutationObserver(() => {
          const now = read()
          if (now.art) window.__strokeAtInjection.push(now)
        }).observe(hostEl, { childList: true })
      })
      // Let a few art-less frames go by so the cold value is on record.
      await page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))))

      releaseArt()
      await expect(stage.locator('.icust-stage-host svg')).toHaveCount(1)
      // Settle, then take a few more frames so a late correction would show too.
      await page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(() => requestAnimationFrame(r)))))
      const { frames, injected, settled } = await page.evaluate(() => ({
        frames: window.__strokeFrames,
        injected: window.__strokeAtInjection,
        settled: document.querySelector('.icust-stage').style.getPropertyValue('--ig-stroke'),
      }))

      const cold = frames.filter(f => !f.art).map(f => f.stroke)
      const withArt = frames.filter(f => f.art)
      expect(cold.length, 'frames recorded before the art arrived').toBeGreaterThan(0)
      expect(withArt.length, 'frames recorded with the art on screen').toBeGreaterThan(0)
      // Hand-checked: 2px default at the 24px export size over a 256 box is 2 / (24/256) = 21.33 units
      // (the stage draws at 112px, with the stroke scaled to match),
      // against 2 units for a 24 box. If these matched, the test could not tell.
      expect(Number(settled)).toBeCloseTo(21.33, 1)
      expect(cold, 'the cold stage used the 24-unit stroke').toContain('2')
      expect(injected.length, 'the host was filled once the art landed').toBeGreaterThan(0)
      expect(injected.map(f => f.stroke), 'stroke at the moment the art entered the host')
        .toEqual(injected.map(() => settled))
      expect(withArt.map(f => f.stroke), 'stroke on every frame that held the art')
        .toEqual(withArt.map(() => settled))
    } finally { releaseBatch(); releaseArt() }
  })

  test('cached markup opens without a loading frame', async ({ page }) => {
    await signIn(page, { plan: 'pro' })
    await go(page, '/create/icons')
    await choosePack(page, 'logos')
    // Logos is a coloured pack, so its cells carry a chip; the default grid's do not.
    const cell = page.locator('.ig .ic:has(.ig-chip)').first()
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

test.describe('the customiser\'s "Similar in this pack" row while its images are loading', () => {
  test.skip(isLiveIconify(), 'this spec controls when the Similar images arrive')

  // The tiles are <img>-backed buttons. Hold only those image requests: the stage
  // fetches its own art with fetch(), and the grid takes glyphs from the batch.
  const SIMILAR_IMAGE = (u) => ICONIFY_HOSTS.includes(u.hostname) && /^\/lucide\/arrow-[^/]+\.svg$/.test(u.pathname)
  const tileState = (tile) => tile.evaluate((el) => {
    const css = getComputedStyle(el)
    const r = el.getBoundingClientRect()
    return { visibility: css.visibility, opacity: css.opacity, height: r.height, width: r.width, ready: el.dataset.ready }
  })

  test('a tile is invisible, unfocusable and still 44px until its image loads, and a failed one stays hidden', async ({ page }) => {
    watch(page, PERSONA)
    await go(page, '/create/icons')
    await expect(page.locator('.ig .ic').first()).toBeVisible({ timeout: 20_000 })

    let release
    const held = new Promise((resolve) => { release = resolve })
    const held_ = { requested: new Set(), failName: null }
    await page.route(SIMILAR_IMAGE, async (route) => {
      if (route.request().resourceType() !== 'image') return route.fallback()
      const name = new URL(route.request().url()).pathname.split('/').pop().replace(/\.svg$/, '')
      held_.requested.add(name)
      await held
      if (name !== held_.failName) return route.fallback()
      // A body that is not an image: the <img> errors, and nothing is logged.
      return route.fulfill({
        status: 200, contentType: 'image/svg+xml; charset=utf-8',
        headers: { 'access-control-allow-origin': '*', [ICONIFY_STUB_HEADER]: '1' }, body: 'this is not an image',
      })
    })
    try {
      await choosePack(page, 'lucide')
      // Open the icon once its own glyph has drawn, so the stage uses that cached
      // markup and the only images held are the Similar tiles'.
      const opened = page.locator('.ig .ic[aria-label="Customise arrow-right"]')
      await expect(opened.locator(':is(img, svg.ig-sym)')).toBeVisible({ timeout: 20_000 })
      await opened.click()
      const row = page.locator('.icust-similar-row')
      const tiles = row.locator('.icust-similar-btn')
      await expect(tiles).toHaveCount(6)
      // Lazy images only start once the row is near the viewport.
      await row.evaluate((el) => el.scrollIntoView({ block: 'center' }))
      await expect.poll(() => held_.requested.size, { timeout: 20_000 }).toBe(6)

      // POSITIVE CONTROL for "held": every tile has asked for its image and none has it.
      const names = await tiles.evaluateAll((els) => els.map((el) => el.getAttribute('aria-label').replace(/^Open /, '')))
      expect([...held_.requested].sort(), 'each tile requested its own image').toEqual([...names].sort())
      held_.failName = names[names.length - 1]

      for (let i = 0; i < 6; i += 1) {
        const tile = tiles.nth(i)
        await expect(tile, `tile ${names[i]} is visible before its image loads`).toBeHidden()
        const s = await tileState(tile)
        expect(s.visibility).toBe('hidden')
        expect(s.opacity).toBe('0')
        expect(s.ready, 'data-ready is set before the image loaded').toBeUndefined()
        expect(s.height, 'a waiting tile keeps its 44px box').toBe(44)
        expect(s.width).toBe(44)
      }
      const rowBox = await row.evaluate((el) => el.getBoundingClientRect().height)
      expect(rowBox, 'the row stays one 44px line while every tile waits').toBe(44)

      // Tab from the control before the row must not land on a waiting tile. Save is the last
      // control ahead of the row (Reset is hidden, and so cannot take focus, until something is
      // edited), and the guard proves the focus really started there.
      const save = page.locator('.icust-save')
      await expect(save).toBeEnabled()
      await save.focus()
      await expect(save, 'the Tab walk starts on the control just before the row').toBeFocused()
      for (let i = 0; i < 4; i += 1) {
        await page.keyboard.press('Tab')
        const onTile = await page.evaluate(() => document.activeElement?.classList.contains('icust-similar-btn'))
        expect(onTile, `Tab ${i + 1} landed on a Similar tile that is not shown`).toBe(false)
      }

      release()

      // The five that load fade in, are focusable, and the row did not move.
      for (let i = 0; i < 5; i += 1) {
        const tile = tiles.nth(i)
        await expect(tile, `tile ${names[i]} shows once its image has loaded`).toBeVisible({ timeout: 20_000 })
        await expect(tile).toHaveCSS('opacity', '1')
        await expect(tile).toHaveAttribute('data-ready', 'true')
        expect((await tileState(tile)).height).toBe(44)
      }
      await expect(row.locator('.icust-similar-btn:visible'), 'exactly the five that loaded are shown').toHaveCount(5)
      expect(await row.evaluate((el) => el.getBoundingClientRect().height)).toBe(44)

      // The one whose image failed never appears, and keeps its place.
      const failed = tiles.nth(5)
      await expect.poll(() => failed.evaluate((el) => el.querySelector('img').complete), { timeout: 20_000 }).toBe(true)
      expect(await failed.evaluate((el) => el.querySelector('img').naturalWidth), 'the failed image has no pixels').toBe(0)
      await expect(failed).toBeHidden()
      await expect(failed).not.toHaveAttribute('data-ready', /.*/)
      expect((await tileState(failed)).height).toBe(44)

      // Positive control for the Tab check: a shown tile IS reachable from the same spot.
      await save.focus()
      await expect(save).toBeFocused()
      await page.keyboard.press('Tab')
      await expect(page.getByRole('button', { name: `Open ${names[0]}`, exact: true })).toBeFocused()
    } finally { release() }
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
  // The default listing names its icons from each pack's head file, so those are
  // the "catalogue" the page waits on; every one is answered 4 s after release.
  const heads = await holdIconHeads(page, { delay: () => 4000 })
  try {
    await go(page, '/create/icons')
    await expect(page.locator('.ig-skel')).toHaveCount(60)
    // POSITIVE CONTROL: the hold caught the heads, so the skeleton is waiting on them.
    await expect.poll(() => heads.requested.length, { timeout: 20_000 }).toBe(5)
    heads.release()
    // Cross the first-page timeout while every head response is held.
    await page.waitForTimeout(3000)
    expect(heads.answered).toEqual([])
    await expect(page.locator('.pl-empty')).toHaveCount(0)
    await expect(page.getByText('No icons to show', { exact: true })).toHaveCount(0)
    await expect(page.locator('.ig-skel')).toHaveCount(60)
    await expect(page.locator('.ig-status')).toHaveText('Loading icons\u2026')
    await expect(page.locator('.ig-status')).toBeVisible()
    await expect(page.locator('.ig-skel')).toHaveCount(0, { timeout: 20_000 })
    await expect(page.locator('.ig .ic').first()).toBeVisible()
    expect(await page.evaluate(() => window.__sawEmptyIcons)).toBe(false)
  } finally { heads.release() }
})

test('staggered catalogues keep the signed-out first page intact at 768', async ({ page }) => {
  test.skip(isLiveIconify(), 'this test controls catalogue arrival times')
  await page.setViewportSize({ width: 768, height: 900 })
  const packs = ['lucide', 'tabler', 'iconoir', 'heroicons', 'ph']
  // Each pack's head file arrives at its own time once released.
  const heads = await holdIconHeads(page, {
    delay: (pack) => {
      const index = packs.indexOf(pack)
      expect(index, 'only signed-out packs are requested').toBeGreaterThanOrEqual(0)
      return 150 + index * 200
    },
  })
  const arrivals = heads.answered
  const release = heads.release
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
    await expect(page.locator('.ig .ic :is(img, svg.ig-sym)').first()).toBeVisible()
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
          const { release } = await holdIconHeads(page)
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
            await expect(page.locator('.ig .ic :is(img, svg.ig-sym)').nth(before.columns)).toBeVisible()
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

// A search typed before the first catalogue lands is answered from the search
// skeleton, which cannot know how many packs the answer will hold. The skeleton
// reserves the pack label for any multi-pack scope; a narrow query whose hits
// all sit in one pack loads a grid with no label, so the cells get shorter.
for (const width of [390, 1440]) {
  for (const { query, packs } of [{ query: 'arrow', packs: 'several packs' }, { query: 'chevron', packs: 'one pack' }]) {
    test.describe(`search skeleton against ${packs} at ${width}`, () => {
      test.skip(isLiveIconify(), 'this test holds the catalogue and search')
      test(`signed in, "${query}" loads cells as tall as the skeleton's`, async ({ page }) => {
        await page.setViewportSize({ width, height: 900 })
        await signIn(page, { plan: 'pro' })
        let releaseSearch
        const heldSearch = new Promise(resolve => { releaseSearch = resolve })
        const { release: releaseCatalogue } = await holdIconHeads(page)
        await page.route(u => ICONIFY_HOSTS.includes(u.hostname) && u.pathname === '/search',
          async route => { await heldSearch; await route.fallback() })
        const cellHeight = () => page.locator('.ig').evaluate(grid => {
          const columns = getComputedStyle(grid).gridTemplateColumns.split(' ').length
          return grid.children[Math.min(columns, grid.children.length - 1)].getBoundingClientRect().height
        })
        try {
          await go(page, '/create/icons')
          await expect(page.locator('.ig-skel').first()).toBeVisible()
          await page.getByLabel('Search icons').first().fill(query)
          // The search fires after a 300 ms debounce; its request is the proof it has started.
          await page.waitForRequest(r => new URL(r.url()).pathname === '/search')
          await expect(page.locator('.ig-skel').first()).toBeVisible()
          const skeletonHeight = await cellHeight()
          releaseSearch()
          await expect(page.locator('.ig-skel')).toHaveCount(0)
          await expect(page.locator('.ig .ic img, .ig .ic svg').first()).toBeVisible()
          const labelled = await page.locator('.ig .ic-pack').count()
          expect(labelled > 0).toBe(query === 'arrow')
          expect(Math.abs(await cellHeight() - skeletonHeight)).toBeLessThanOrEqual(2)
        } finally { releaseSearch(); releaseCatalogue() }
      })
    })
  }
}

// A pack-labelled row can hold mono glyphs (24px) beside coloured chips (36px
// boxes drawing 24px art). Every glyph top and every name top in the row must
// agree, or the coloured cell reads as dropped below its neighbours.
test.describe('a result row that mixes mono and coloured glyphs at 1440', () => {
  test.skip(isLiveIconify(), 'the live API decides which packs answer; this spec reads the fixture')

  test('glyph tops and name tops line up across the row', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await signIn(page, { plan: 'pro' })
    await go(page, '/create/icons')
    await expect(page.locator('.ig .ic :is(img, svg.ig-sym)').nth(3)).toBeVisible({ timeout: 20_000 })
    await page.getByLabel('Search icons').first().fill('star')
    await expect(page.locator('.ig .ic .ig-chip img').first()).toBeVisible({ timeout: 20_000 })
    await expect(page.locator('.ig .ig-skel, .ig .ig-glyph-wait, .ig .ig-chip--wait')).toHaveCount(0)
    await expect.poll(() => page.locator('.ig .ic :is(img, svg.ig-sym)').evaluateAll(
      (cells) => cells.length > 0 && cells.every((c) => getComputedStyle(c).opacity === '1' && (c.matches('svg')
        ? !!document.querySelector(`#ig-sprite ${c.querySelector('use').getAttribute('href')}`)
        : c.complete && c.naturalWidth > 0)),
    )).toBe(true)

    const rows = await page.locator('.ig').evaluate((grid) => {
      const byRow = new Map()
      for (const cell of grid.querySelectorAll('.ic')) {
        const top = Math.round(cell.getBoundingClientRect().top)
        const img = cell.querySelector('img, svg.ig-sym').getBoundingClientRect().top
        const name = cell.querySelector('.ic-name').getBoundingClientRect().top
        const list = byRow.get(top) || []
        list.push({ coloured: !!cell.querySelector('.ig-chip'), packed: !!cell.querySelector('.ic-pack'), img, name })
        byRow.set(top, list)
      }
      return [...byRow.values()]
    })
    const mixed = rows.filter((row) => row.some((c) => c.coloured) && row.some((c) => !c.coloured))
    expect(mixed.length, 'the fixture search no longer produces a row of mono and coloured cells').toBeGreaterThan(0)
    for (const row of mixed) {
      expect(row.every((c) => c.packed), 'cells in a multi-pack result carry a pack line').toBe(true)
      const spread = (key) => Math.max(...row.map((c) => c[key])) - Math.min(...row.map((c) => c[key]))
      expect(spread('img'), 'glyph tops across the row').toBeLessThanOrEqual(1)
      expect(spread('name'), 'name tops across the row').toBeLessThanOrEqual(1)
    }
  })
})

// While a signed-in search is held, the skeleton cycles its slots through every
// pack, coloured ones included. Each slot must reserve the 24px the loaded glyph
// takes and start at the same height in its cell, so nothing moves on arrival.
test.describe('the search skeleton in a multi-pack scope at 1440', () => {
  test.skip(isLiveIconify(), 'this test holds the search')

  test('every slot is 24px and sits where the loaded glyph will', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await signIn(page, { plan: 'pro' })
    let release
    const held = new Promise((resolve) => { release = resolve })
    // Hold the pack heads too, so the skeleton is what answers the typed search.
    const heads = await holdIconHeads(page)
    await page.route((u) => ICONIFY_HOSTS.includes(u.hostname) && u.pathname === '/search',
      async (route) => { await held; await route.fallback() })
    try {
      await go(page, '/create/icons')
      await expect(page.locator('.ig-skel').first()).toBeVisible()
      await page.getByLabel('Search icons').first().fill('star')
      await page.waitForRequest((r) => new URL(r.url()).pathname === '/search')
      await expect(page.locator('.ig.ig--reserve-pack .ig-skel').first()).toBeVisible()
      // Offsets from each cell's own top: row position cannot hide a difference.
      const offsets = (selector) => page.locator('.ig').evaluate((grid, sel) => [...grid.children].map((cell) => {
        const box = cell.querySelector(sel).getBoundingClientRect()
        return { top: box.top - cell.getBoundingClientRect().top, height: box.height }
      }), selector)
      const waiting = await offsets('.ig-skel-slot')
      expect(waiting.length).toBeGreaterThan(13)
      expect(await page.locator('.ig .ig-skel-slot:not(.ig-skel-slot--mono)').count(),
        'positive control: some skeleton slots stand in for coloured packs').toBeGreaterThan(0)
      for (const slot of waiting) expect(slot.height, 'a skeleton slot is not 24px tall').toBe(24)
      expect(new Set(waiting.map((s) => Math.round(s.top))).size, 'skeleton slots start at different heights').toBe(1)

      release()
      await expect(page.locator('.ig-skel')).toHaveCount(0)
      await expect(page.locator('.ig .ic .ig-chip img').first()).toBeVisible({ timeout: 20_000 })
      const loaded = await offsets('img, svg.ig-sym')
      for (let i = 0; i < Math.min(waiting.length, loaded.length); i += 1) {
        expect(Math.abs(loaded[i].top - waiting[i].top), `glyph ${i} moved when the results arrived`).toBeLessThanOrEqual(1)
      }
    } finally { release(); heads.release() }
  })
})
