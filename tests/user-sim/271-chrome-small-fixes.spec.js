// SPEC 271: FOUR SMALL FIXES TO THE SHARED CHROME.
//
//   1. The floating Feedback button is not drawn below 768px, for any pointer;
//      the footer link and the right-click menu still reach the form at 390.
//   2. The footer content sits in the same 1240px column as the Learn hub, so
//      the footer logo and the hub heading share a left edge at 1440 and 1920,
//      with the header still full-bleed.
//   3. A GIF the builder reveals on a phone-width screen ends above the fixed
//      tab bar and the action bar, and Build sits above the tab bar.
//   4. At 1000px and narrower (where the legal contents is the "On this page"
//      disclosure, not the sticky rail) every clause of /privacy and /terms
//      ends with a 44px "Contents" link back to it; from 1001px it is not drawn.
//
// MUTATIONS (each should turn the named test red):
//   - global.css: drop `(max-width:767px)` from the `.global-feedback-btn`
//     hide rule: "the floating Feedback button is not drawn at 390 / 767"
//     fail on the mouse window (a phone's coarse pointer already hid it);
//   - global.css: make that media query `(max-width:700px)`: the 767 case fails;
//   - global.css: hide the button at every width: "still there from 768" fails;
//   - global.css: delete `max-width:1240px` from `.app-footer-inner`: "the
//     footer logo lines up with the hub heading" fails at 1440 and 1920, and
//     "one 1240px column" fails at 1920;
//   - shared.js: delete the `tabbarH` term from `revealResult`'s `bottom`: "a
//     rebuilt result that was half-hidden is scrolled clear" fails, because the
//     result is judged already visible while its foot is under the bars;
//   - file-converter.css: delete the `html.has-tabbar .fc .fc-actionbar` lift:
//     the same test fails on "Build is under the tab bar";
//   - LegalContents.jsx: drop `<BackToContents />` from Terms.jsx or Privacy.jsx:
//     the clause-ends-with-a-link tests fail for that page;
//   - legal.css: delete `.lgl-back { display: none; }`: the 1001 / 1440 tests
//     fail; delete `min-height: 44px` from the narrow rule: the 44px test fails;
//   - legal.css: change that narrow query to 767px: the 1000 test fails.
import fs from 'node:fs'
import path from 'node:path'
import { test, expect } from './base.js'
import { go, watch, restingScrollY } from './helpers.js'

// A route inside the app shell that has both the floating button (above 767)
// and the site footer.
const SHELL_ROUTE = '/learn/help'

// A point whose ancestors are plain, so the right-click menu has no reason to
// yield to the browser's own.
async function plainPoint(page) {
  return page.evaluate(() => {
    const bad = new Set(['INPUT', 'TEXTAREA', 'SELECT', 'A', 'IMG', 'VIDEO', 'AUDIO',
      'CANVAS', 'EMBED', 'OBJECT', 'IFRAME', 'BUTTON', 'OPTION'])
    const { innerWidth: w, innerHeight: h } = window
    for (let y = Math.round(h * 0.25); y < h * 0.8; y += 30) {
      for (let x = Math.round(w * 0.15); x < w * 0.85; x += 40) {
        const el = document.elementFromPoint(x, y)
        if (!el) continue
        let n = el
        let ok = true
        for (let i = 0; i < 8 && n; i += 1) {
          if (bad.has(n.tagName) || n.isContentEditable || n.dataset?.feedbackSurface != null) { ok = false; break }
          n = n.parentElement
        }
        if (ok) return { x, y }
      }
    }
    return null
  })
}

test.describe('1 · the floating Feedback button on a narrow mouse window', () => {
  for (const width of [390, 767]) {
    test(`the floating Feedback button is not drawn at ${width}px`, async ({ page }) => {
      watch(page, 'someone reading with a narrow desktop window')
      await page.setViewportSize({ width, height: 900 })
      await go(page, SHELL_ROUTE)
      await expect(page.locator('.global-feedback-btn'), `the button must be hidden at ${width}px`).toBeHidden()
    })
  }

  for (const width of [768, 1440]) {
    test(`the floating Feedback button is still there from ${width}px`, async ({ page }) => {
      watch(page, 'someone on a tablet or desktop')
      await page.setViewportSize({ width, height: 900 })
      await go(page, SHELL_ROUTE)
      await expect(page.locator('.global-feedback-btn'), `the button must be drawn at ${width}px`).toBeVisible()
    })
  }

  test('at 390 the footer link and the right-click menu still reach the form', async ({ page }) => {
    watch(page, 'someone with a narrow window who wants to send feedback')
    await page.setViewportSize({ width: 390, height: 900 })
    await go(page, SHELL_ROUTE)

    // The right-click menu opens the feedback dialog.
    const at = await plainPoint(page)
    expect(at, 'a plain surface to right-click on').not.toBeNull()
    await page.mouse.click(at.x, at.y, { button: 'right' })
    await page.getByRole('button', { name: 'Share feedback on this' }).click()
    const dialog = page.getByRole('dialog', { name: 'Share feedback' })
    await expect(dialog, 'the right-click menu opens the feedback dialog').toBeVisible()
    await page.keyboard.press('Escape')
    await expect(dialog).toHaveCount(0)

    // The footer's "Send feedback" link goes to the feedback page, which holds the form.
    const link = page.locator('.app-footer').getByRole('link', { name: 'Send feedback' })
    await link.scrollIntoViewIfNeeded()
    await link.click()
    await expect(page).toHaveURL(/\/feedback$/)
    await expect(page.getByRole('textbox').first(), 'the feedback page shows its form').toBeVisible()
  })
})

test.describe('2 · the footer shares the page content edge', () => {
  for (const [width, height] of [[1440, 900], [1920, 1080]]) {
    test(`on /learn the footer logo lines up with the hub heading at ${width}`, async ({ page }) => {
      watch(page, 'someone scrolling the Learn hub to its footer')
      await page.setViewportSize({ width, height })
      await go(page, '/learn')
      await expect(page.locator('.srf-h1')).toBeVisible()
      const edges = await page.evaluate(() => {
        const left = (s) => document.querySelector(s).getBoundingClientRect().left
        const nav = document.querySelector('.pnav').getBoundingClientRect()
        return {
          h1: left('.srf-h1'),
          footer: left('.app-footer-brand'),
          navLeft: nav.left,
          navWidth: nav.width,
          viewport: document.documentElement.clientWidth,
        }
      })
      expect(Math.abs(edges.footer - edges.h1),
        `footer logo at x=${edges.footer}, hub heading at x=${edges.h1}`).toBeLessThanOrEqual(1)
      // The header is still the full-bleed bar.
      expect(edges.navLeft, 'the header starts at the left edge').toBe(0)
      expect(edges.navWidth, 'the header runs the full width').toBeGreaterThanOrEqual(edges.viewport - 1)
    })
  }

  // /plans draws its own marketing footer, not the site footer, so it is not here.
  for (const route of ['/learn', '/learn/help', '/privacy']) {
    test(`${route}: at 1920 the footer content is one 1240px column, centred`, async ({ page }) => {
      watch(page, 'someone on a wide monitor')
      await page.setViewportSize({ width: 1920, height: 1080 })
      await go(page, route)
      const box = await page.locator('.app-footer-inner').evaluate((el) => {
        const r = el.getBoundingClientRect()
        return { left: r.left, right: r.right, width: r.width, viewport: document.documentElement.clientWidth }
      })
      expect(Math.round(box.width), `footer content is ${box.width}px wide`).toBe(1240)
      expect(Math.abs(box.left - (box.viewport - box.right)),
        `footer content is off-centre: ${box.left}px left, ${box.viewport - box.right}px right`).toBeLessThanOrEqual(1)
    })
  }
})

// ── 3 · a revealed GIF clears the phone tab bar ──────────────────────────────
// The GIF builder is driven the way 99-animation-builder drives it: the real
// ffmpeg core is answered from node_modules.
const CORE_DIR = path.join(process.cwd(), 'node_modules', '@ffmpeg', 'core', 'dist', 'esm')

async function serveCore(page) {
  await page.route((u) => u.href.startsWith('https://cdn.jsdelivr.net/'), async (route) => {
    const name = route.request().url().split('/').pop()
    const file = path.join(CORE_DIR, name)
    if (!fs.existsSync(file)) return route.fulfill({ status: 404, body: '' })
    return route.fulfill({
      status: 200,
      headers: { 'content-type': name.endsWith('.wasm') ? 'application/wasm' : 'text/javascript', 'access-control-allow-origin': '*' },
      body: fs.readFileSync(file),
    })
  })
}

async function makeFrames(page) {
  const out = await page.evaluate(async () => {
    const res = []
    for (const [name, hex] of [['frame-1.png', '#ff0000'], ['frame-2.png', '#00ff00'], ['frame-3.png', '#0000ff']]) {
      const c = document.createElement('canvas')
      c.width = 64
      c.height = 48
      const x = c.getContext('2d')
      x.fillStyle = hex
      x.fillRect(0, 0, 64, 48)
      const b = await new Promise((r) => c.toBlob(r, 'image/png'))
      res.push({ name, bytes: Array.from(new Uint8Array(await b.arrayBuffer())) })
    }
    return res
  })
  return out.map((f) => ({ name: f.name, mimeType: 'image/png', buffer: Buffer.from(f.bytes) }))
}

test.describe('3 · a revealed GIF clears the tab bar and the action bar', () => {
  test('390: Build sits above the tab bar, and a rebuilt result that was half-hidden is scrolled clear', async ({ page }) => {
    test.setTimeout(180_000)
    watch(page, 'someone building a GIF on a phone-width screen')
    await page.setViewportSize({ width: 390, height: 844 })
    // Reduced motion: the reveal is an instant jump, so there is no glide to wait out.
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await serveCore(page)
    await go(page, '/create/file-converter')
    await page.getByRole('tab', { name: 'Animation', exact: true }).click()
    await page.locator('.fc-drop input[type="file"]').setInputFiles(await makeFrames(page))
    await expect(page.locator('.fc-frame')).toHaveCount(3)

    const tabs = page.locator('.pnav-tabs')
    await expect(tabs, 'the phone tab bar is drawn at 390').toBeVisible()
    const build = page.getByRole('button', { name: 'Build GIF' })
    const geometry = () => page.evaluate(() => {
      const top = (s) => document.querySelector(s).getBoundingClientRect().top
      const result = document.querySelector('.fc-result')?.getBoundingClientRect()
      return {
        tabsTop: top('.pnav-tabs'),
        barTop: top('.fc-actionbar'),
        resultTop: result ? result.top : null,
        resultBottom: result ? result.bottom : null,
        buildBottom: [...document.querySelectorAll('.fc-actionbar button')].find((b) => /^Build/.test(b.textContent)).getBoundingClientRect().bottom,
        stickyBottom: document.querySelector('[data-tool-toolbar]').getBoundingClientRect().bottom,
      }
    })

    // The Build button is pinned above the tab bar, not under it.
    const before = await geometry()
    expect(before.buildBottom, 'Build is under the tab bar').toBeLessThanOrEqual(before.tabsTop + 1)
    await expect(build).toBeInViewport()

    // First build, then a second with the result left half under the bars.
    await build.click()
    const img = page.locator('.fc-result img[alt="GIF result"]')
    await expect(img).toBeAttached({ timeout: 150_000 })
    const firstSrc = await img.getAttribute('src')
    await restingScrollY(page, 'after the first reveal')

    // Slide the page so the result's bottom edge hides 20px behind the action
    // bar, with its top still below the toolbar.
    await page.evaluate(() => {
      const r = document.querySelector('.fc-result').getBoundingClientRect()
      const barTop = document.querySelector('.fc-actionbar').getBoundingClientRect().top
      window.scrollBy(0, r.bottom - (barTop + 20))
    })
    await restingScrollY(page, 'after moving the result under the bars')
    const hidden = await geometry()
    expect(hidden.resultBottom, 'set-up: the result bottom should hide behind the bars').toBeGreaterThan(Math.min(hidden.barTop, hidden.tabsTop) + 10)
    expect(hidden.resultTop, 'set-up: the result top should still be on screen').toBeGreaterThanOrEqual(hidden.stickyBottom)

    await page.getByRole('button', { name: 'Build GIF' }).click()
    await expect.poll(() => img.getAttribute('src'), { timeout: 150_000, message: 'the second build never replaced the result' }).not.toBe(firstSrc)

    await expect.poll(async () => {
      const g = await geometry()
      return g.resultBottom <= Math.min(g.barTop, g.tabsTop) + 1 && g.resultTop >= g.stickyBottom - 1
    }, { timeout: 3000, message: 'the revealed result still ends under the action bar or the tab bar' }).toBe(true)
  })
})

// ── 4 · the legal pages give a way back to the contents ──────────────────────
test.describe('4 · /privacy and /terms: every clause ends with a Contents link where the index is not a rail', () => {
  for (const route of ['/privacy', '/terms']) {
    for (const width of [390, 767, 1000]) {
      test(`${route} at ${width}: each clause ends with a 44px Contents link`, async ({ page }) => {
        watch(page, 'someone reading the long legal page on a phone')
        await page.setViewportSize({ width, height: 844 })
        await go(page, route)
        await expect(page.locator('.lgl .lgl-sec').first()).toBeVisible()
        const rows = await page.evaluate(() => [...document.querySelectorAll('.lgl .lgl-sec')].map((s) => {
          const last = s.lastElementChild
          const r = last.getBoundingClientRect()
          return { id: s.id, isLink: last.matches('a.lgl-back'), text: last.textContent.trim(), height: r.height, href: last.getAttribute('href') }
        }))
        expect(rows.length, 'the page has clauses').toBeGreaterThan(5)
        for (const row of rows) {
          expect(row.isLink, `${row.id} does not end with the Contents link`).toBe(true)
          expect(row.text).toMatch(/Contents$/)
          expect(row.height, `${row.id}: the Contents link is ${row.height}px tall`).toBeGreaterThanOrEqual(44)
          expect(row.href).toBe('#legal-contents')
        }
      })
    }

    for (const width of [1001, 1440]) {
      test(`${route} at ${width}: the sticky rail is the index, so no Contents link is drawn`, async ({ page }) => {
        watch(page, 'someone reading the legal page on a desktop')
        await page.setViewportSize({ width, height: 900 })
        await go(page, route)
        await expect(page.locator('.lgl .lgl-sec').first()).toBeVisible()
        await expect(page.locator('nav.lgl-toc'), 'the rail is the index here').toBeVisible()
        await expect(page.locator('.lgl-back').first()).toBeHidden()
      })
    }

    test(`${route} at 390: the link returns to the opened index`, async ({ page }) => {
      watch(page, 'someone at the bottom of a long legal page')
      await page.setViewportSize({ width: 390, height: 844 })
      await go(page, route)
      const links = page.locator('.lgl-sec .lgl-back')
      const last = links.last()
      await last.scrollIntoViewIfNeeded()
      await last.click()
      const index = page.locator('.lgl-toc-m')
      await expect(index, 'the index opens').toHaveAttribute('open', '')
      await expect.poll(() => page.evaluate(() => {
        const r = document.querySelector('#legal-contents').getBoundingClientRect()
        return r.top >= 0 && r.top < innerHeight / 2
      }), { message: 'the page did not return to the index' }).toBe(true)
    })
  }
})
