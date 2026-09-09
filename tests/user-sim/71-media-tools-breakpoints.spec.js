// The 2026-09-09 breakpoint pass over the media, icon and content tools:
// /create/icons, /create/emoji, /create/file-converter, /create/alt-text, /seo
// and /create/semantic-color.
//
// Rendered at 320, 390, 430, 768, 1024, 1097, 1120, 1136, 1280, 1440 and
// 1920, light and dark, reduced-motion on and off, signed out and then signed
// in free and Pro, with a file dropped, while loading, with the network
// refused, with results on screen and with every panel open — by a Playwright
// sweep that measured boxes and computed colours rather than reading
// stylesheets (the same reason 23-responsive-mid-band and 65-new-surfaces-
// breakpoints give). Every test below pins a fault that sweep found, at the
// width and in the state it was found, and each one was watched fail with its
// fix reverted (the mutation is named on the test).
//
// `test` comes from ./base.js, not @playwright/test — that is where Google One
// Tap is stubbed on the browser fixture and the Iconify catalogue is served
// from tests/user-sim/fixtures/iconify/.
import fs from 'node:fs'
import path from 'node:path'
import { test, expect } from './base.js'
import { go, watch, signIn } from './helpers.js'
import { fixturePacks, isLiveIconify, ICONIFY_STUB_HEADER, REFUSED_VALUE } from './iconify-stub.js'

const IOS_UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1'

/** A context at an exact width: a phone with real touch metrics under 700, a desktop above. */
async function at(browser, width, theme = 'light') {
  const ctx = await browser.newContext(width < 700
    ? { viewport: { width, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true, userAgent: IOS_UA, colorScheme: theme }
    : { viewport: { width, height: 900 }, colorScheme: theme })
  await ctx.addInitScript((t) => { try { localStorage.setItem('vs-t', t) } catch { /* private mode */ } }, theme)
  const page = await ctx.newPage()
  return { ctx, page }
}

async function settle(page) {
  await page.evaluate(async () => {
    for (let round = 0; round < 2; round++) {
      await document.fonts.ready
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))
    }
  })
}

/** Relative luminance of a computed `rgb(...)` colour. */
function luminance(css) {
  const m = css.match(/rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)/)
  if (!m) throw new Error(`unparseable colour: ${css}`)
  const lin = m.slice(1, 4).map((v) => Number(v) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4))
  return 0.2126 * lin[0] + 0.7152 * lin[1] + 0.0722 * lin[2]
}
const contrast = (fg, bg) => {
  const [a, b] = [luminance(fg), luminance(bg)].sort((x, y) => y - x)
  return (a + 0.05) / (b + 0.05)
}

// ─────────────────────────────────────────────────────────────────────────────
// /create/icons — the masthead pill
// ─────────────────────────────────────────────────────────────────────────────

const LIVE = 'UIL4B_LIVE_ICONIFY is set: the live catalogue is not the fixture, so the refused state cannot be forced'
// helpers.js drops the console lines Chromium logs for the refused responses
// for this persona and these hosts only — see 66-icon-library-offline-fixture.
const REFUSED = 'visitor whose icon catalogue is refused'

/** Every Iconify host answers the way the network did on 2026-09-08, stamped as a deliberate refusal. */
async function refuseIconify(page) {
  const headers = { [ICONIFY_STUB_HEADER]: REFUSED_VALUE }
  await page.route((u) => u.hostname === 'api.iconify.design',
    (route) => route.fulfill({ status: 429, contentType: 'text/plain', headers, body: 'Too Many Requests' }))
  await page.route((u) => u.hostname === 'api.simplesvg.com' || u.hostname === 'api.unisvg.com',
    (route) => route.fulfill({ status: 403, contentType: 'text/plain', headers, body: 'Forbidden' }))
}

test.describe('/create/icons · the masthead pill says what the grid is showing', () => {
  // The pill read navigator.onLine alone, so with every host refusing (429
  // from api.iconify.design, 403 from both fallbacks, browser online the whole
  // time) it said "Live library connected" with a green dot directly above the
  // notice saying the icon service could not be reached. Rendered 2026-09-09
  // at 320, 390, 768, 1024, 1280 and 1920 in both themes: every cell.
  //
  // MUTATION: restore `online ? 'Live library connected' : …` in
  // IconEmojiLibrary.jsx (drop the `iconFallback` branch) — both widths fail
  // on the pill's text, and the recovery half of the second test fails on
  // the same string never changing.
  for (const width of [320, 1280]) {
    test(`with every host refusing, the pill does not claim a live library at ${width}px`, async ({ browser }) => {
      test.skip(isLiveIconify(), LIVE)
      const { ctx, page } = await at(browser, width, width === 320 ? 'dark' : 'light')
      watch(page, REFUSED)
      await refuseIconify(page)
      await go(page, '/create/icons')
      const notice = page.getByRole('status').filter({ hasText: /Couldn.t reach the icon service/ })
      await expect(notice).toBeVisible({ timeout: 15000 })
      await settle(page)

      const pill = page.locator('.lib-net')
      await expect(pill).toBeVisible()
      await expect(pill, 'the browser is online; the catalogue is not').not.toContainText('Live library connected')
      await expect(pill, 'the same words the grid\'s own status line uses for this state').toHaveText('Built-in icons')
      await expect(pill).toHaveClass(/is-fallback/)
      await expect(pill, 'the pill is not the offline pill either — the device is online').not.toHaveClass(/is-offline/)
      // The dot is the amber one, not the green one: the fallback reads as a
      // state to notice, the same signal the offline pill already uses.
      const dot = await pill.locator('i').evaluate((el) => getComputedStyle(el).backgroundColor)
      expect(dot).not.toBe('rgb(74, 222, 128)')
      await ctx.close()
    })
  }

  test('the pill follows the catalogue back after Try again', async ({ browser }) => {
    test.skip(isLiveIconify(), LIVE)
    const { ctx, page } = await at(browser, 1280)
    watch(page, REFUSED)
    await refuseIconify(page)
    await go(page, '/create/icons')
    const notice = page.getByRole('status').filter({ hasText: /Couldn.t reach the icon service/ })
    await expect(notice).toBeVisible({ timeout: 15000 })
    await expect(page.locator('.lib-net')).toHaveText('Built-in icons')

    // The hosts answer again (the fixture takes over from the page-level
    // refusal) and the notice's own control re-runs the browse.
    await page.unrouteAll()
    await notice.getByRole('button', { name: 'Try again' }).click()
    await expect(notice).toHaveCount(0, { timeout: 20000 })
    await expect(page.getByText(new RegExp(`All packs · [\\d,]+ icons · ${fixturePacks().length} sets`))).toBeVisible({ timeout: 20000 })
    await expect(page.locator('.lib-net')).toHaveText('Live library connected')
    await expect(page.locator('.lib-net')).toHaveClass(/is-online/)
    await ctx.close()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// /create/emoji — the skin-tone popover
// ─────────────────────────────────────────────────────────────────────────────

test('/create/emoji · the skin-tone popover keeps all six tones inside the viewport at 768, 1024, 1280 and 1920', async ({ browser }) => {
  // The trigger is the toolbar's last control, hard against the right margin
  // on any desktop, and the panel was `left:0` on it: at 1280 the six tones
  // needed 250px from x=1179, so the fourth was cut in half and the last two
  // were outside the viewport. Measured 2026-09-09 at 768 (16px past), 1024
  // (149px), 1280 (149px), 1440 and 1920, both themes. At 320 and 390 the
  // trigger wraps to the left of its row and the panel fitted.
  //
  // MUTATION: drop the `[data-pop-align="end"]` rule for .emoji-tone-pop in
  // global.css (or take the popover off usePopover) — every width fails on
  // `right`.
  test.setTimeout(90_000)
  const failures = []
  for (const width of [768, 1024, 1280, 1920]) {
    const { ctx, page } = await at(browser, width, width === 1024 ? 'dark' : 'light')
    watch(page, `someone choosing a skin tone on a ${width}px screen`)
    await go(page, '/create/emoji')
    await page.locator('.emoji-tone-btn').click()
    const pop = page.locator('.emoji-tone-pop')
    await expect(pop).toBeVisible()
    await settle(page)
    const m = await page.evaluate(() => {
      const r = document.querySelector('.emoji-tone-pop').getBoundingClientRect()
      const cells = [...document.querySelectorAll('.emoji-skin-btn')].map((b) => b.getBoundingClientRect())
      return { left: Math.round(r.left), right: Math.round(r.right), vw: innerWidth, cells: cells.length, lastRight: Math.round(Math.max(...cells.map((c) => c.right))) }
    })
    // Keyboard: the shared contract moves focus into the panel on open.
    const focusInside = await page.evaluate(() => !!document.activeElement?.closest('.emoji-tone-pop'))
    await ctx.close()
    expect(m.cells, 'six tones render').toBe(6)
    if (m.right > m.vw) failures.push(`${width}px: the panel runs ${m.right - m.vw}px past the right edge`)
    if (m.left < 0) failures.push(`${width}px: the panel starts ${-m.left}px off the left edge`)
    if (m.lastRight > m.vw) failures.push(`${width}px: the last tone is ${m.lastRight - m.vw}px outside the viewport`)
    if (!focusInside) failures.push(`${width}px: opening did not move focus into the panel`)
  }
  expect(failures, `the skin-tone popover:\n  ${failures.join('\n  ')}`).toEqual([])
})

test('/create/emoji · at 320 the skin-tone popover still fits, and Escape returns focus to its trigger', async ({ browser }) => {
  // The other side of the flip: on a phone the trigger sits at the left of its
  // row, so end-alignment would put the panel off the LEFT edge. placePopover
  // chooses per edge; this pins that the phone case did not regress.
  const { ctx, page } = await at(browser, 320)
  watch(page, 'someone choosing a skin tone on a small phone')
  await go(page, '/create/emoji')
  await page.locator('.emoji-tone-btn').click()
  const pop = page.locator('.emoji-tone-pop')
  await expect(pop).toBeVisible()
  await settle(page)
  const m = await pop.evaluate((el) => { const r = el.getBoundingClientRect(); return { left: Math.round(r.left), right: Math.round(r.right) } })
  expect(m.left, 'inside the left edge').toBeGreaterThanOrEqual(0)
  expect(m.right, 'inside the right edge').toBeLessThanOrEqual(320)
  await page.keyboard.press('Escape')
  await expect(pop).toHaveCount(0)
  expect(await page.evaluate(() => document.activeElement?.className)).toContain('emoji-tone-btn')
  await ctx.close()
})

// ─────────────────────────────────────────────────────────────────────────────
// Two chips under AA in light
// ─────────────────────────────────────────────────────────────────────────────

test('/create/emoji and /create/file-converter · the count chip and the SOON tag read at 4.5:1 in light', async ({ browser }) => {
  // Both are --t3 ink on a --bg-3 chip: 4.07:1 in light (#6c6c66 on #e4e2da)
  // at every width from 320 to 1920, on 10px and 8px type. --t2 is 4.95:1.
  // Dark measured clear before and after.
  //
  // MUTATION: put `color:var(--t3)` back on .emoji-section-count or .fc-soon
  // in global.css — the matching line fails at 4.07.
  const { ctx, page } = await at(browser, 1280)
  watch(page, 'someone reading the small print on a light screen')
  await go(page, '/create/emoji')
  const count = page.locator('.emoji-section-count').first()
  await expect(count).toBeVisible()
  const a = await count.evaluate((el) => ({ fg: getComputedStyle(el).color, bg: getComputedStyle(el).backgroundColor }))
  expect(contrast(a.fg, a.bg), `.emoji-section-count ${a.fg} on ${a.bg}`).toBeGreaterThanOrEqual(4.5)

  await go(page, '/create/file-converter')
  const soon = page.locator('.fc-soon')
  await expect(soon).toBeVisible()
  const b = await soon.evaluate((el) => ({ fg: getComputedStyle(el).color, bg: getComputedStyle(el).backgroundColor }))
  expect(contrast(b.fg, b.bg), `.fc-soon ${b.fg} on ${b.bg}`).toBeGreaterThanOrEqual(4.5)
  await ctx.close()
})

// ─────────────────────────────────────────────────────────────────────────────
// /create/alt-text — a refused generation
// ─────────────────────────────────────────────────────────────────────────────

/** A 320x200 PNG made in the page: a real image the tool has to decode and resize. */
async function pngBytes(page) {
  const b64 = await page.evaluate(() => {
    const c = document.createElement('canvas'); c.width = 320; c.height = 200
    const x = c.getContext('2d'); x.fillStyle = '#1c40f2'; x.fillRect(0, 0, 320, 200); x.fillStyle = '#f2b640'; x.fillRect(80, 50, 160, 100)
    return c.toDataURL('image/png').split(',')[1]
  })
  return Buffer.from(b64, 'base64')
}

for (const [width, status, body] of [
  [320, 500, { error: 'The model provider returned an error. Try again in a moment.' }],
  [1280, 429, { error: 'Daily limit reached', usage: { daily: { used: 10, limit: 10 }, monthly: { used: 40, limit: 100 } } }],
]) {
  test(`/create/alt-text · a ${status} leaves the card a card, and says nothing was generated, at ${width}px`, async ({ browser }) => {
    // Two faults on one screen. The message and the failed card shared the
    // class name `alt-card-error` (the card through `alt-card-${status}`, the
    // message literally), so the message's rule — 12px red text, a red tint,
    // 8px padding, a 10px radius, a red hairline — was painted on the whole
    // card: the preview inset by 8px inside a pink box. And generateAll
    // toasted "Generated 1 alt text" for everything it TRIED, so the refusal
    // ended with a green tick over a card saying the opposite. Rendered
    // 2026-09-09, both themes, 320 through 1920.
    //
    // MUTATIONS: rename the message back to `alt-card-error` in
    // AltTextGenerator.jsx and alt-text.css — the padding and radius reads
    // fail; drop `if (done > 0)` from generateAll — the toast assertion fails.
    const { ctx, page } = await at(browser, width, width === 320 ? 'dark' : 'light')
    watch(page, `a signed-in user whose generation is refused with a ${status}, on a ${width}px screen`)
    await signIn(page, { plan: 'free' })
    await page.route('**/api/ai', (route) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) }))
    await go(page, '/create/alt-text')
    await expect(page.locator('.alt-dropzone')).toBeVisible({ timeout: 15000 })
    await page.locator('.alt-dropzone input[type="file"]').setInputFiles({ name: 'photo.png', mimeType: 'image/png', buffer: await pngBytes(page) })
    await expect(page.locator('.alt-card-ready')).toBeVisible({ timeout: 10000 })
    await page.locator('.alt-toolbar .btn-primary').click()

    const card = page.locator('.alt-card.alt-card-error')
    await expect(card).toBeVisible({ timeout: 15000 })
    await expect(card.locator('.alt-card-error-msg')).toContainText(body.error)
    await settle(page)
    const m = await card.evaluate((el) => {
      const cs = getComputedStyle(el)
      const msg = getComputedStyle(el.querySelector('.alt-card-error-msg'))
      const preview = el.querySelector('.alt-card-preview').getBoundingClientRect()
      const box = el.getBoundingClientRect()
      return { padTop: cs.paddingTop, fontSize: cs.fontSize, msgPad: msg.paddingTop, previewInset: Math.round(preview.left - box.left) }
    })
    expect(m.padTop, 'the card keeps no padding of its own').toBe('0px')
    expect(m.previewInset, 'the preview still bleeds to the card edge (the 1px border)').toBeLessThanOrEqual(1)
    expect(m.fontSize, 'the card did not inherit the message\'s 12px').not.toBe('12px')
    expect(m.msgPad, 'the message keeps its own padding').toBe('8px')

    // The batch is over when the toolbar's primary is pressable again. If the
    // old toast fired it is on screen right now — toasts stay for seconds.
    await expect(page.locator('.alt-toolbar .btn-primary')).toBeEnabled({ timeout: 10000 })
    await expect(page.locator('.toast'), 'nothing was generated, so nothing says it was').not.toContainText(/Generated \d+ alt text/)
    await ctx.close()
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// /seo — Structured data — the per-question delete
// ─────────────────────────────────────────────────────────────────────────────

test('/seo · Structured data · every "Remove question" control is at least 24px at 320 and 1280', async ({ browser }) => {
  // 18x18 at every width (a 14px glyph plus 2px padding), measured 2026-09-09.
  //
  // MUTATION: drop `min-width:24px;min-height:24px` from .seo-faq-del in
  // seo-inspector.css — both widths fail at 18x18.
  test.setTimeout(60_000)
  const failures = []
  for (const width of [320, 1280]) {
    const { ctx, page } = await at(browser, width)
    watch(page, `someone editing FAQ schema on a ${width}px screen`)
    await go(page, '/seo')
    await page.getByRole('tab', { name: 'Structured data' }).click()
    const panel = page.locator('#seo-panel-schema')
    await expect(panel).toBeVisible()
    const type = panel.locator('select').first()
    const faq = (await type.locator('option').allTextContents()).find((o) => /faq/i.test(o))
    expect(faq, 'the schema type list offers FAQ').toBeTruthy()
    await type.selectOption({ label: faq })
    await panel.getByRole('button', { name: 'Add question' }).click()
    const dels = panel.locator('.seo-faq-del')
    await expect(dels.first()).toBeVisible()
    await settle(page)
    const boxes = await dels.evaluateAll((els) => els.map((el) => { const r = el.getBoundingClientRect(); return { name: el.getAttribute('aria-label'), w: +r.width.toFixed(1), h: +r.height.toFixed(1) } }))
    await ctx.close()
    expect(boxes.length, 'two questions, two delete controls').toBeGreaterThanOrEqual(2)
    for (const b of boxes) if (b.w < 24 || b.h < 24) failures.push(`${width}px: "${b.name}" is ${b.w}x${b.h}`)
  }
  expect(failures, `delete controls under 24px:\n  ${failures.join('\n  ')}`).toEqual([])
})

// ─────────────────────────────────────────────────────────────────────────────
// /create/semantic-color — the custom-hue slider
// ─────────────────────────────────────────────────────────────────────────────

test('/create/semantic-color · the custom-hue slider is a 24px control that still paints a 12px track', async ({ browser }) => {
  // The gradient and the hairline sat on the <input> itself at 14px tall, so
  // the whole range control was a 14px target (every custom-hue row, 320 to
  // 1920, 2026-09-09). The input is now a 24px transparent box and the track
  // pseudo-element carries the 12px bar — the paint is asserted too, because
  // a taller input that also grew the bar would be a redesign.
  //
  // MUTATION: put `height:14px;background:var(--arc-grad,var(--bg-3))` back
  // on input.cs-hue-slider — the height read fails at 14.
  const { ctx, page } = await at(browser, 390)
  watch(page, 'a designer dialling a custom hue on a phone')
  await go(page, '/create/semantic-color')
  const custom = page.locator('.stc-role-presets button').filter({ hasText: /^custom$/i }).first()
  await expect(custom).toBeVisible()
  await custom.click()
  const slider = page.locator('input.cs-hue-slider').first()
  await expect(slider).toBeVisible()
  await settle(page)
  const box = await slider.boundingBox()
  const inputPaint = await slider.evaluate((el) => getComputedStyle(el).backgroundColor)
  // The bar is read from PIXELS. getComputedStyle(el, "::-webkit-slider-
  // runnable-track") answers with the input's own box in Chromium, so the
  // only honest measure of "the bar is still 12px" is how many rows of the
  // control are painted. Sampled in two columns away from the thumb, taking
  // the shorter: whichever column the thumb is not in shows the bare bar.
  const shot = await page.screenshot({ clip: box })
  const painted = await page.evaluate(async ({ png, w, h }) => {
    const img = new Image()
    await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = `data:image/png;base64,${png}` })
    const c = document.createElement('canvas'); c.width = img.width; c.height = img.height
    const x = c.getContext('2d'); x.drawImage(img, 0, 0)
    const scale = img.width / w
    const col = (fx) => {
      const px = Math.round(fx * img.width)
      const d = x.getImageData(px, 0, 1, img.height).data
      const ground = [d[0], d[1], d[2]]
      let rows = 0
      for (let y = 0; y < img.height; y++) {
        const i = y * 4
        if (Math.abs(d[i] - ground[0]) + Math.abs(d[i + 1] - ground[1]) + Math.abs(d[i + 2] - ground[2]) > 24) rows++
      }
      return rows / scale
    }
    return { bar: Math.min(col(0.12), col(0.88)), box: h }
  }, { png: shot.toString('base64'), w: box.width, h: box.height })
  await ctx.close()
  expect(box.height, 'the control is at least 24px tall').toBeGreaterThanOrEqual(24)
  expect(inputPaint, 'the input box itself is transparent').toBe('rgba(0, 0, 0, 0)')
  expect(painted.bar, 'the painted bar is still the 12px track (plus its hairline), not a 24px slab').toBeGreaterThanOrEqual(10)
  expect(painted.bar).toBeLessThanOrEqual(16)
})

// ─────────────────────────────────────────────────────────────────────────────
// /create/file-converter — the size-change line, and the engine download
// ─────────────────────────────────────────────────────────────────────────────

test('/create/file-converter · the batch size-change line reads at 4.5:1 on the page ground in light', async ({ browser }) => {
  // "2 files: 2.4 KB → 1.4 KB • 42% smaller" sat on --bg-0 in --ok, which is
  // a fill colour: 4.32:1 at 12px in light (2026-09-09, every width). The
  // -strong ink of the same hue is the text step.
  //
  // MUTATION: put `color: 'var(--ok)'` back in sizeDelta — fails at 4.32.
  const { ctx, page } = await at(browser, 1280)
  watch(page, 'someone reading how much a batch shrank')
  await go(page, '/create/file-converter')
  const png = await pngBytes(page)
  await page.locator('.fc-drop input[type="file"]').setInputFiles([
    { name: 'photo.png', mimeType: 'image/png', buffer: png },
    { name: 'logo.png', mimeType: 'image/png', buffer: png },
  ])
  await expect(page.locator('.fc-queue')).toBeVisible()
  await page.locator('.fc-actions .btn-accent').click()
  await expect(page.locator('.fc-dl').first()).toBeVisible({ timeout: 20000 })
  const line = page.locator('.fc-queue span', { hasText: /% (smaller|larger)|same size/ }).last()
  await expect(line).toBeVisible()
  await settle(page)
  const m = await line.evaluate((el) => {
    const parse = (c) => { const k = c.match(/rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)(?:,\s*([\d.]+))?/); return k ? [+k[1], +k[2], +k[3], k[4] == null ? 1 : +k[4]] : null }
    let p = el, bg = null
    while (p && p !== document.documentElement) { const c = parse(getComputedStyle(p).backgroundColor); if (c && c[3] >= 1) { bg = c; break } p = p.parentElement }
    if (!bg) bg = parse(getComputedStyle(document.documentElement).backgroundColor)
    return { fg: getComputedStyle(el).color, bg: `rgb(${bg.slice(0, 3).join(', ')})`, text: el.textContent.trim() }
  })
  await ctx.close()
  expect(m.text).toMatch(/smaller|larger|same size/)
  expect(contrast(m.fg, m.bg), `${m.text}: ${m.fg} on ${m.bg}`).toBeGreaterThanOrEqual(4.5)
})

test('/create/file-converter · Video → GIF · the engine download shows bytes against its total, and a bar', async ({ browser }) => {
  // For the whole 32 MB fetch the status line said "Loading converter engine…
  // (about 9 MB, first run only)" beside a spinner and nothing moved — on a
  // phone connection that is a minute of nothing (2026-09-09, every width).
  // The CDN is answered from node_modules/@ffmpeg/core, the way
  // 57-converter-engine-cdn does it, so the total is the real wasm size and
  // the count is measured against it. A MutationObserver records what the
  // line said WHILE the download ran, because it is gone by the time the GIF
  // is on screen.
  //
  // MUTATION: pass `null` instead of the bytes callback in convert() — no
  // .fc-status-bytes is ever observed and the bar never mounts.
  test.setTimeout(180_000)
  const { ctx, page } = await at(browser, 1280)
  watch(page, 'someone turning a screen recording into a GIF, watching the engine arrive')
  const coreDir = path.join(process.cwd(), 'node_modules', '@ffmpeg', 'core', 'dist', 'esm')
  const wasmSize = fs.statSync(path.join(coreDir, 'ffmpeg-core.wasm')).size
  await page.route((u) => u.href.startsWith('https://cdn.jsdelivr.net/'), (route) => {
    const name = route.request().url().split('/').pop()
    const file = path.join(coreDir, name)
    if (!fs.existsSync(file)) return route.fulfill({ status: 404, body: '' })
    return route.fulfill({ status: 200, headers: { 'content-type': name.endsWith('.wasm') ? 'application/wasm' : 'text/javascript', 'access-control-allow-origin': '*' }, body: fs.readFileSync(file) })
  })
  await go(page, '/create/file-converter')
  await page.getByRole('button', { name: 'Video → GIF converter' }).click()
  const clip = await page.evaluate(async () => {
    const canvas = document.createElement('canvas'); canvas.width = 64; canvas.height = 64
    const c = canvas.getContext('2d'); c.fillStyle = '#1c40f2'; c.fillRect(0, 0, 64, 64)
    const rec = new MediaRecorder(canvas.captureStream(10)); const chunks = []
    rec.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data) }
    const stopped = new Promise((r) => { rec.onstop = r })
    rec.start()
    for (let i = 0; i < 10; i++) { c.fillStyle = i % 2 ? '#1c40f2' : '#f24040'; c.fillRect(0, 0, 64, 64); await new Promise((r) => setTimeout(r, 60)) }
    rec.stop(); await stopped
    return Array.from(new Uint8Array(await new Blob(chunks, { type: 'video/webm' }).arrayBuffer()))
  })
  await page.locator('.fc-drop input[type="file"]').setInputFiles({ name: 'clip.webm', mimeType: 'video/webm', buffer: Buffer.from(clip) })
  await page.evaluate(() => {
    window.__seen = { bytes: [], bar: [] }
    new MutationObserver(() => {
      const b = document.querySelector('.fc-status-bytes'); if (b) window.__seen.bytes.push(b.textContent.trim())
      const bar = document.querySelector('.fc-progress[role="progressbar"]'); if (bar) window.__seen.bar.push([+bar.getAttribute('aria-valuenow'), +bar.getAttribute('aria-valuemax')])
    }).observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true })
  })
  await page.getByRole('button', { name: 'Convert to GIF' }).click()
  await expect(page.locator('img[alt="GIF result"]')).toBeVisible({ timeout: 150_000 })
  const seen = await page.evaluate(() => window.__seen)
  const after = await page.locator('.fc-status-bytes').count()
  await ctx.close()
  expect(seen.bytes.length, 'a byte count was on screen during the download').toBeGreaterThan(0)
  expect(seen.bytes.some((t) => / of /.test(t)), `the count was measured against the total: ${seen.bytes.slice(-3).join(' | ')}`).toBe(true)
  expect(seen.bar.length, 'the bar mounted').toBeGreaterThan(0)
  const last = seen.bar[seen.bar.length - 1]
  expect(last[1], 'the bar\'s total is the wasm\'s real size').toBe(wasmSize)
  expect(last[0], 'and it reached it').toBe(wasmSize)
  // Once the engine is in, the count is gone: a download readout, not a fixture.
  expect(after).toBe(0)
})
