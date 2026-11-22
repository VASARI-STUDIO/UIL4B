// The three desktop mega menus (Create, Discover, Learn) are ONE frame: same left, top,
// width and height, one shared opening origin, and wider than the old 1120px. Test seam:
// the open panel (#pnav-mega) under the header triggers (.pnav-trigger) at /create/palette.
//
// Run: LANE=onef PLAYWRIGHT_PORT=4330 npx playwright test -c pw-lane.config.js tests/user-sim/442-mega-menu-one-frame.spec.js
//
// MUTATIONS (each should fail the named test, then be put back):
//   · Set the panel's left again from the open trigger (PillNav.jsx placement effect: use `tl` in
//     `left`): "one frame" fails on x.
//   · Set `panel.style.transformOrigin` from the trigger again: "one frame" fails on transform-origin.
//   · Put `width:min(1120px,...)` back on `.pnav-menu` (v3-shell.css): "width" fails at 1440 and 1280.
//   · Drop the shared `min-height` on `.pnav-menu-cols` for the menus: "one frame" fails on height.
//   · Give `.pnav-menu` `transition:all`: "the panel names what it transitions" fails.
import { test, expect } from './base.js'
import { go, signIn, watch } from './helpers.js'

const NAMES = ['Create', 'Discover', 'Learn']
const trig = (page, name) => page.locator('.pnav-trigger', { hasText: name })
const panel = (page) => page.locator('#pnav-mega')

async function open(browser, width, theme = 'light') {
  const ctx = await browser.newContext({ viewport: { width, height: 900 } })
  const page = await ctx.newPage()
  watch(page, `one-frame ${width}`)
  await page.addInitScript((t) => { try { localStorage.setItem('vs-t', t) } catch { /* blocked */ } }, theme)
  await signIn(page, { plan: 'free', projects: 1 })
  await go(page, '/create/palette')
  return { ctx, page }
}

// Wait for every animation to finish, then read the frame.
async function frame(page) {
  await expect(panel(page)).toBeVisible()
  await page.evaluate(() => Promise.all(document.getAnimations().map((a) => a.finished.catch(() => {}))))
  await page.waitForTimeout(50)
  return panel(page).evaluate((el) => {
    const r = el.getBoundingClientRect()
    return { x: r.x, y: r.y, w: r.width, h: r.height, right: r.right, origin: getComputedStyle(el).transformOrigin, transform: getComputedStyle(el).transform }
  })
}

const near = (a, b) => Math.abs(a - b) <= 1

test.describe('one frame for the three menus', () => {
  for (const vw of [1440, 1280, 1024]) {
    test(`one frame at ${vw}: same left, top, width, height and opening origin`, async ({ browser }) => {
      const { ctx, page } = await open(browser, vw)
      const f = {}
      for (const name of NAMES) {
        await trig(page, name).click()
        f[name] = await frame(page)
        await page.keyboard.press('Escape')
        await expect(panel(page)).toHaveCount(0)
      }
      for (const name of ['Discover', 'Learn']) {
        expect(near(f[name].x, f.Create.x), `${name} x ${f[name].x} vs ${f.Create.x}`).toBe(true)
        expect(near(f[name].y, f.Create.y), `${name} y`).toBe(true)
        expect(near(f[name].w, f.Create.w), `${name} width ${f[name].w} vs ${f.Create.w}`).toBe(true)
        expect(near(f[name].h, f.Create.h), `${name} height ${f[name].h} vs ${f.Create.h}`).toBe(true)
        expect(f[name].origin, `${name} transform-origin`).toBe(f.Create.origin)
      }
      for (const name of NAMES) {
        expect(f[name].x, `${name} left edge`).toBeGreaterThanOrEqual(23.5)
        expect(f[name].right, `${name} right edge`).toBeLessThanOrEqual(vw - 23.5)
      }
      await ctx.close()
    })
  }

  test('width: about 1260 at 1440, wide at 1280, the viewport less the gutters at 1024', async ({ browser }) => {
    const got = {}
    for (const vw of [1440, 1280, 1024]) {
      const { ctx, page } = await open(browser, vw)
      await trig(page, 'Create').click()
      got[vw] = (await frame(page)).w
      await ctx.close()
    }
    expect(got[1440], 'width at 1440').toBeGreaterThanOrEqual(1232)
    expect(got[1280], 'width at 1280').toBeGreaterThanOrEqual(1200)
    expect(got[1280], 'width at 1280').toBeLessThanOrEqual(1280 - 48)
    expect(Math.abs(got[1024] - (1024 - 48)), 'width at 1024').toBeLessThanOrEqual(1)
  })

  test('switching straight from Create to Discover to Learn does not move the frame', async ({ browser }) => {
    const { ctx, page } = await open(browser, 1440)
    await trig(page, 'Create').click()
    const a = await frame(page)
    await trig(page, 'Discover').hover()
    const b = await frame(page)
    await trig(page, 'Learn').click()
    const c = await frame(page)
    for (const [n, f] of [['Discover', b], ['Learn', c]]) {
      expect(near(f.x, a.x) && near(f.y, a.y) && near(f.w, a.w) && near(f.h, a.h), `${n} frame ${JSON.stringify(f)} vs ${JSON.stringify(a)}`).toBe(true)
      expect(f.origin, `${n} origin`).toBe(a.origin)
    }
    await ctx.close()
  })

  test('the panel names what it transitions: no transition:all', async ({ browser }) => {
    const { ctx, page } = await open(browser, 1440)
    await trig(page, 'Create').click()
    await frame(page)
    const tp = await panel(page).evaluate((el) => getComputedStyle(el).transitionProperty)
    expect(tp.split(',').map((s) => s.trim()), 'panel transition-property').not.toContain('all')
    await ctx.close()
  })
})
