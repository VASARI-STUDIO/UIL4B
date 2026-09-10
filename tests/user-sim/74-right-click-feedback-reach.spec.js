// RIGHT-CLICK FEEDBACK: does it reach the pages people need it on, does it
// open where they pointed, and does it leave a phone's long-press alone?
//
// Backlog `right-click-feedback`. The feature itself shipped some time ago and
// its payload rules are covered by tests/unit/element-signature.test.js. What
// was never covered — and what was measured broken on 2026-09-10 against a real
// build of `main` — is everything about the gesture as a USER meets it:
//
//   REACH.   FeedbackButton (which owns the menu) was mounted inside AppInner's
//            shell, below App.jsx's chromeless early return. Measured: a
//            right-click offered to report the element on /projects, /settings
//            and /feedback, and did NOTHING on /create/palette,
//            /create/type-scale, /create/contrast, /discover, /learn and /home.
//            Every Create tool — the pages where a tool misbehaving is the
//            thing someone wants to report — had no way in at all.
//
//   ANCHOR.  `detail` is 0 for a genuine right-click in Chromium, so the
//            "detail === 0 means keyboard" heuristic read every mouse click as
//            keyboard-invoked and anchored the menu to document.activeElement,
//            i.e. <body>. Measured: a right-click at (200, 200) opened the menu
//            at (8, 919) on /projects and (8, 580) on /settings — the bottom of
//            the page, every single time.
//
//   FOCUS.   usePopover was handed a closer that did not restore focus, and the
//            anchor it would otherwise return focus to unmounts in the same
//            commit. Measured: focus was on `.pop-item`, and Escape left it on
//            BODY — a keyboard user dropped out of the page.
//
//   TOUCH.   A long-press fires `contextmenu` too. Measured in a Pixel 7
//            context: the long-press came back defaultPrevented, so the native
//            callout — select, copy, paste, save image — was being swallowed on
//            every phone, on a platform with no Shift+long-press to escape with.
//
// These are browser facts, so they are asserted in a browser. The structural
// half (where the component is mounted, and the two route lists agreeing) is
// pinned in tests/unit/feedback-reach.test.js, which fails without a build.
import { test, expect } from './base.js'
import { go, watch } from './helpers.js'

// Routes that render CHROMELESS — full-screen with their own PillNav, outside
// AppInner's shell. These are the ones that had no feedback gesture at all.
// NOTE /create/palette is deliberately NOT here: PaletteBuilder puts its own
// onContextMenu on every column and swatch, so ours correctly stands aside
// there. That deferral is a property worth having, so it gets its own test
// below rather than being quietly avoided.
const CHROMELESS = ['/create/contrast', '/create/type-scale', '/discover', '/learn']
// And the shell routes, which always had it and must keep it.
const SHELL = ['/projects', '/settings']

// Find a point whose whole ancestor chain is plain — no input, link, image or
// media — so nativeMenuWins has no legitimate reason to yield. Returning a
// POINT rather than a locator is deliberate: where the menu opens relative to
// the pointer is one of the things under test, so the test has to own the
// coordinates it clicked at.
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

test.describe('right-click feedback reaches the whole product', () => {
  for (const route of CHROMELESS) {
    test(`${route} can report the element under the pointer`, async ({ page }) => {
      // THE REGRESSION THIS FILE EXISTS FOR. Every one of these routes takes an
      // early return above the app shell, so a component mounted inside the
      // shell is absent here — which is what was measured on 2026-09-10.
      watch(page, 'someone hitting a bug inside a Create tool')
      await go(page, route)

      const at = await plainPoint(page)
      expect(at, `a plain surface to right-click on ${route}`).not.toBeNull()
      await page.mouse.click(at.x, at.y, { button: 'right' })

      const menu = page.locator('.fbx-menu')
      await expect(menu, `the feedback menu must reach ${route}`).toBeVisible()
      await expect(page.getByRole('button', { name: 'Report a problem here' })).toBeVisible()
      // It names what the report will be about BEFORE anything is committed to.
      await expect(menu.locator('.pop-head')).not.toBeEmpty()
    })
  }

  test('the floating button did NOT spread to the Create tools with it', async ({ page }) => {
    // Hoisting the mount was about the MENU. The button is fixed in the
    // bottom-right corner, which global.css already records colliding with the
    // footer attribution and the /seo device toggle — so its reach is
    // deliberately unchanged, and this is the assertion that keeps it that way.
    watch(page, 'someone using a Create tool at full width')
    for (const route of CHROMELESS) {
      await go(page, route)
      await expect(page.locator('.global-feedback-btn'),
        `no floating feedback button belongs on ${route}`).toHaveCount(0)
    }
    for (const route of SHELL) {
      await go(page, route)
      await expect(page.locator('.global-feedback-btn'),
        `${route} keeps the button it always had`).toHaveCount(1)
    }
  })

  test('the menu opens at the pointer, not at the bottom of the page', async ({ page }) => {
    // `detail` is 0 for a real right-click in Chromium. Measured before the
    // fix: a click at (200, 200) put the menu at (8, 919).
    watch(page, 'someone right-clicking mid-page')
    await go(page, '/projects')
    const at = await plainPoint(page)
    expect(at).not.toBeNull()

    await page.mouse.click(at.x, at.y, { button: 'right' })
    const menu = page.locator('.fbx-menu')
    await expect(menu).toBeVisible()

    const box = await menu.boundingBox()
    expect(box.x, 'the menu starts at the pointer').toBeGreaterThanOrEqual(at.x - 6)
    expect(box.x, 'and not far to its right').toBeLessThan(at.x + 24)
    expect(box.y, 'and hangs below it').toBeGreaterThanOrEqual(at.y - 6)
    expect(box.y, 'not at the bottom of the document').toBeLessThan(at.y + 40)
  })

  test('the keyboard reaches it, and Escape hands focus back', async ({ page }) => {
    // A feature reachable only by mouse would shut keyboard and assistive-tech
    // users out of the one channel this app has for hearing that it is broken.
    // Measured before the fix: Escape left focus on BODY.
    watch(page, 'a keyboard user reporting a problem')
    await go(page, '/projects')

    // A BUTTON, deliberately: a focused link would correctly yield to the
    // browser's own menu. This is about whether the keyboard can get in at all.
    const opener = page.locator('button:visible').first()
    await expect(opener).toBeVisible()
    await opener.focus()
    await page.keyboard.press('Shift+F10')

    const menu = page.locator('.fbx-menu')
    await expect(menu).toBeVisible()
    // Focus is INSIDE the panel, so the first Tab lands on its contents rather
    // than continuing through the page behind it.
    await expect(page.locator('.fbx-menu *:focus, .fbx-menu:focus')).toHaveCount(1)

    await page.keyboard.press('Escape')
    await expect(menu).toHaveCount(0)
    await expect(opener, 'Escape must not drop a keyboard user on <body>').toBeFocused()
  })

  test('a text field and a selection keep the browser menu, and Shift always does', async ({ page }) => {
    // The cost this feature pays. `preventDefault` is what actually decides
    // whether the browser shows its own menu, so that is what is asserted —
    // not merely that our menu stayed hidden.
    watch(page, 'someone pasting into the feedback form')
    await go(page, '/feedback')
    const field = page.locator('textarea').first()
    await expect(field).toBeVisible()

    await page.evaluate(() => {
      window.__prevented = null
      document.addEventListener('contextmenu', (e) => { window.__prevented = e.defaultPrevented }, false)
    })
    await field.click({ button: 'right' })
    await expect(page.locator('.fbx-menu')).toHaveCount(0)
    expect(await page.evaluate(() => window.__prevented),
      'a right-click on a textarea must keep the menu Paste lives in').toBe(false)

    // Shift is the escape hatch on a surface that IS ours to claim.
    await go(page, '/projects')
    const at = await plainPoint(page)
    await page.evaluate(() => {
      window.__prevented = null
      document.addEventListener('contextmenu', (e) => { window.__prevented = e.defaultPrevented }, false)
    })
    // page.mouse.click() has no `modifiers` option — it is silently ignored,
    // which would make this a plain right-click asserting the wrong thing. The
    // key has to be genuinely held down around the press.
    await page.keyboard.down('Shift')
    await page.mouse.click(at.x, at.y, { button: 'right' })
    await page.keyboard.up('Shift')
    await expect(page.locator('.fbx-menu')).toHaveCount(0)
    expect(await page.evaluate(() => window.__prevented),
      'Shift+right-click must always hand the browser menu back').toBe(false)
  })
})

test.describe('a local menu still wins', () => {
  test('PaletteBuilder keeps its own right-click menu on a colour column', async ({ page }) => {
    // Rule 3 of the three that keep this feature's cost honest: ours is the
    // app-wide DEFAULT and defers to anything more specific. Hoisting the mount
    // so the menu reaches every route is exactly the change that could have
    // broken this — /create/palette had no app-wide menu at all before, so
    // nothing was competing for the gesture there until now.
    watch(page, 'someone rearranging a palette')
    await go(page, '/create/palette')

    const col = page.locator('.plb-col').first()
    await expect(col).toBeVisible()
    await col.click({ button: 'right' })

    // PaletteBuilder's own menu, not ours.
    await expect(page.locator('.fbx-menu'),
      'the app-wide menu must stand aside for the tool\'s own').toHaveCount(0)
  })
})

test.describe('a phone keeps its long-press', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true })

  test('a long-press is left to the browser, because there is no way back from it', async ({ page }) => {
    // Browsers fire `contextmenu` from a long-press, and that gesture is how
    // people select text, copy, paste and save an image on a phone. There is no
    // Shift+long-press, so claiming it removes the escape hatch every other
    // rule here depends on. Measured before the fix, in a Pixel 7 context: the
    // long-press came back defaultPrevented.
    watch(page, 'someone long-pressing text on a phone')
    await go(page, '/projects')

    // The device really is touch-only, or this test proves nothing about the
    // rule it claims to cover.
    const pointers = await page.evaluate(() => ({
      coarse: matchMedia('(pointer: coarse)').matches,
      anyFine: matchMedia('(any-pointer: fine)').matches,
    }))
    expect(pointers.coarse, 'a phone reports a coarse pointer').toBe(true)
    expect(pointers.anyFine, 'and no fine pointer at all').toBe(false)

    const at = await plainPoint(page)
    expect(at).not.toBeNull()
    // The same event a long-press synthesises, dispatched on the element under
    // that point. `defaultPrevented` is the whole question: if it comes back
    // true, the native callout never appears.
    const outcome = await page.evaluate(({ x, y }) => {
      const el = document.elementFromPoint(x, y)
      const ev = new MouseEvent('contextmenu', {
        bubbles: true, cancelable: true, clientX: x, clientY: y, button: 0, detail: 0,
      })
      el.dispatchEvent(ev)
      return { prevented: ev.defaultPrevented }
    }, at)

    expect(outcome.prevented,
      'the native long-press callout must survive on a touch-only device').toBe(false)
    await expect(page.locator('.fbx-menu'),
      'and our menu must not open from a long-press').toHaveCount(0)
  })
})

test.describe('the menu itself holds up', () => {
  for (const theme of ['light', 'dark']) {
    test(`it fits and is legible at 390 in ${theme} theme, with reduced motion`, async ({ browser }) => {
      // The theme is established BEFORE first paint rather than stamped after:
      // .pop carries a transition, so a value read straight after setAttribute
      // is the previous theme's, mid-flight. Same reasoning as
      // 06-colour-tool-workbenches.spec.js.
      const ctx = await browser.newContext({
        colorScheme: theme,
        viewport: { width: 390, height: 844 },
        reducedMotion: 'reduce',
      })
      await ctx.addInitScript((t) => {
        try {
          localStorage.setItem('vs-t', t)
          localStorage.setItem('vs-appearance', JSON.stringify({
            rounding: 'default', density: 'cozy', reducedMotion: true,
          }))
        } catch { /* private mode */ }
      }, theme)
      const page = await ctx.newPage()
      try {
        watch(page, `someone on a 390px phone in ${theme} theme with reduced motion`)
        // A chromeless Create tool, at the width where a 260px menu has least
        // room — and the surface that had no gesture at all before this change.
        await go(page, '/create/contrast')

        const at = await plainPoint(page)
        expect(at).not.toBeNull()
        await page.mouse.click(at.x, at.y, { button: 'right' })

        const menu = page.locator('.fbx-menu')
        await expect(menu).toBeVisible()
        const box = await menu.boundingBox()
        expect(box.x, 'the menu must not hang off the left').toBeGreaterThanOrEqual(0)
        expect(box.x + box.width, 'or off the right').toBeLessThanOrEqual(390)
        expect(box.y + box.height, 'or below the fold').toBeLessThanOrEqual(844)

        // Nothing may push the page sideways — the standing rule from #298.
        const overflow = await page.evaluate(
          () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
        )
        expect(overflow, `horizontal overflow at 390 in ${theme}`).toBeLessThanOrEqual(0)

        // The menu paints a real ground in both themes rather than inheriting a
        // transparent one — a popover you can read the page through is a bug
        // that only shows up in one theme.
        const painted = await menu.evaluate((el) => {
          const bg = getComputedStyle(el).backgroundColor
          const m = bg.match(/[\d.]+/g) || []
          return { bg, alpha: m.length > 3 ? Number(m[3]) : 1 }
        })
        expect(painted.alpha, `the menu must be opaque in ${theme} (${painted.bg})`).toBeGreaterThan(0.85)

        // Both actions are reachable and hittable at this width.
        for (const name of ['Report a problem here', 'Share feedback on this']) {
          const b = page.getByRole('button', { name })
          await expect(b).toBeVisible()
          const bb = await b.boundingBox()
          expect(bb.height, `${name} must be a real target`).toBeGreaterThanOrEqual(24)
        }
      } finally {
        await ctx.close()
      }
    })
  }
})
