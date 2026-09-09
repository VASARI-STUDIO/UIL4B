// "About this project" — the opt-in note in the footer.
//
// The backlog item `founder-intro-popup` asks for a welcome popup. The founder
// was offered one and chose the opposite: "maybe we make it visable when a user
// clicks a certian section or button". Everything below tests THAT surface, and
// the first test is the one that matters most — the panel is not on screen until
// somebody asks for it.
//
// The rest is the contract this app already holds every other dialog to: a real
// focus trap behind `aria-modal`, Escape returning focus to whatever opened it,
// reduced motion honoured in BOTH directions on the two properties the global
// clamp cannot reach, and a wheel over the panel scrolling the panel rather than
// the page Lenis is driving underneath it.
import { test, expect } from './base.js'
import { go, watch } from './helpers.js'

/**
 * Wait until the entrance animation has actually finished.
 *
 * Not optional, and not a sleep. `.fnote` rises with cp-rise, which starts at
 * `translateY(8px) scale(.98)` — so a geometry read taken the instant the panel
 * becomes visible measures a panel that is 98% of its width and 8px low. That is
 * exactly how the 390px case first failed: the sheet's left edge measured 3.9px
 * instead of 0 and its bottom measured 847.4 instead of 844, and BOTH numbers
 * are the animation rather than the layout.
 *
 * Asking the animation layer rather than counting milliseconds also means this
 * needs no special case under reduced motion: there, the rules below cancel the
 * animation outright, `getAnimations()` comes back empty, and the wait returns
 * immediately.
 */
const settle = (page) => page.waitForFunction(() => {
  const els = [document.querySelector('.fnote-overlay'), document.querySelector('.fnote')]
  return els.every((el) => el && el.getAnimations().every((a) => a.playState === 'finished'))
}, null, { timeout: 5000 })

/** Read the trigger's state and whether the panel exists, in one go. */
const probe = (page) => page.evaluate(() => {
  const btn = document.querySelector('.app-footer-note')
  const dialog = document.querySelector('.fnote')
  return {
    trigger: !!btn,
    triggerVisible: !!btn && btn.offsetParent !== null,
    expanded: btn?.getAttribute('aria-expanded') ?? null,
    controls: btn?.getAttribute('aria-controls') ?? null,
    open: !!dialog,
    dialogId: dialog?.id ?? null,
    focusIsTrigger: !!btn && document.activeElement === btn,
    focusInDialog: !!document.activeElement.closest?.('.fnote'),
  }
})

test.describe('the note waits to be asked for', () => {
  test('nothing opens on arrival, and the trigger is what opens it', async ({ page }) => {
    watch(page, 'a first-time visitor who is not interrupted')
    await go(page, '/')
    // Give every auto-open mechanism this could have had — a timer, a first-run
    // flag, a scroll trigger — a generous window to fire in. The assertion is
    // that none of them exists.
    await page.waitForLoadState('load').catch(() => {})
    await page.waitForTimeout(1500)
    await page.mouse.wheel(0, 4000)
    await page.waitForTimeout(600)

    let s = await probe(page)
    expect(s.open, 'the panel must never open by itself').toBe(false)
    expect(s.trigger, 'the footer trigger must be present').toBe(true)
    expect(s.expanded).toBe('false')
    expect(s.controls, 'aria-controls must not point at an element that does not exist').toBe(null)

    await page.locator('.app-footer-note').click()
    s = await probe(page)
    expect(s.open).toBe(true)
    expect(s.expanded).toBe('true')
    expect(s.controls, 'while open, aria-controls names the dialog').toBe(s.dialogId)
  })

  test('the panel is reachable again after it is closed', async ({ page }) => {
    // The failure mode the backlog item named for one-time popups: "a one-time
    // popup nobody can re-open is a dead end". Nothing here is one-time, so the
    // only way to get this wrong is to unmount the trigger.
    watch(page, 'someone who closes the note and then wants it back')
    await go(page, '/')
    for (let i = 0; i < 3; i++) {
      await page.locator('.app-footer-note').click()
      await expect(page.locator('.fnote')).toBeVisible()
      await page.locator('.fnote-close').click()
      await expect(page.locator('.fnote')).toHaveCount(0)
    }
    expect((await probe(page)).triggerVisible).toBe(true)
  })
})

test.describe('keyboard and screen reader', () => {
  test('open, trap, Escape, and focus back on the trigger — no mouse', async ({ page }) => {
    watch(page, 'a keyboard-only reader')
    await go(page, '/')

    await page.locator('.app-footer-note').focus()
    await page.keyboard.press('Enter')
    await expect(page.locator('.fnote')).toBeVisible()

    // Focus lands on the DIALOG, not on its first control, so a screen reader
    // announces the dialog's label before its contents.
    const named = await page.evaluate(() => {
      const d = document.querySelector('.fnote')
      const label = document.getElementById(d.getAttribute('aria-labelledby'))
      return {
        onDialog: document.activeElement === d,
        role: d.getAttribute('role'),
        modal: d.getAttribute('aria-modal'),
        labelText: label?.textContent?.trim() ?? null,
      }
    })
    expect(named.onDialog).toBe(true)
    expect(named.role).toBe('dialog')
    expect(named.modal).toBe('true')
    expect(named.labelText, 'aria-labelledby must resolve to real text').toBeTruthy()

    // Tab all the way round. `aria-modal="true"` claims everything outside is
    // inert; this is the claim being checked rather than taken on trust.
    const visited = []
    for (let i = 0; i < 6; i++) {
      await page.keyboard.press('Tab')
      visited.push(await page.evaluate(() => ({
        inside: !!document.activeElement.closest('.fnote'),
        cls: document.activeElement.className || document.activeElement.tagName,
      })))
    }
    expect(visited.every((v) => v.inside), `focus left the dialog: ${JSON.stringify(visited)}`).toBe(true)
    // And it really did move — a trap that pins focus to one node would satisfy
    // "never left" while making the panel unusable.
    expect(new Set(visited.map((v) => v.cls)).size, 'Tab must move between controls, not freeze').toBeGreaterThan(1)

    await page.keyboard.press('Escape')
    await expect(page.locator('.fnote')).toHaveCount(0)
    // useModalDialog hands focus back a frame AFTER the close (so the key that
    // closed the dialog cannot land on the restored trigger — #436 follow-up
    // 8); the probe reads activeElement, so give it that frame.
    await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))))
    const after = await probe(page)
    expect(after.focusIsTrigger, 'Escape must hand focus back to the trigger').toBe(true)
    expect(after.expanded).toBe('false')
  })

  test('the trigger is a button, not a link that goes nowhere', async ({ page }) => {
    // A dialog opener written as <a href="#"> is announced as a link and
    // activated by Enter but not Space. Space is the half that gets missed.
    watch(page, 'a keyboard user reaching for the space bar')
    await go(page, '/')
    expect(await page.evaluate(() => document.querySelector('.app-footer-note').tagName)).toBe('BUTTON')
    await page.locator('.app-footer-note').focus()
    await page.keyboard.press(' ')
    await expect(page.locator('.fnote')).toBeVisible()
  })
})

test.describe('reduced motion, both directions', () => {
  /** Computed entrance state of the overlay and the panel, with the note open. */
  const motionOf = (page) => page.evaluate(() => {
    const pick = (sel) => {
      const el = document.querySelector(sel)
      const cs = getComputedStyle(el)
      return { animationName: cs.animationName, opacity: cs.opacity, transform: cs.transform }
    }
    return { overlay: pick('.fnote-overlay'), panel: pick('.fnote') }
  })

  test('the in-app toggle set to REDUCE flattens opacity and transform', async ({ browser }) => {
    // The half the global clamp cannot do. It forces durations and delays to
    // near-zero but never touches `opacity` or `transform`, and opacity and
    // transform are exactly what cp-fade and cp-rise animate — so a panel with
    // no rule of its own would still fade up from 0 and slide 8px for someone
    // who asked it not to.
    const ctx = await browser.newContext({ reducedMotion: 'no-preference' })
    const page = await ctx.newPage()
    watch(page, 'a reader who turned motion off in Settings')
    await page.addInitScript(() => {
      try { localStorage.setItem('vs-appearance', JSON.stringify({ reducedMotion: true })) } catch { /* private mode */ }
    })
    await go(page, '/')
    expect(await page.evaluate(() => document.documentElement.getAttribute('data-reduced-motion'))).toBe('true')

    await page.locator('.app-footer-note').click()
    await expect(page.locator('.fnote')).toBeVisible()
    const m = await motionOf(page)
    for (const [what, v] of Object.entries(m)) {
      expect(v.animationName, `${what} still animates under reduced motion`).toBe('none')
      expect(v.opacity, `${what} must not be part-way through a fade`).toBe('1')
      expect(v.transform, `${what} must not be offset`).toBe('none')
    }
    await ctx.close()
  })

  test('the OS preference alone flattens them too', async ({ browser }) => {
    // The attribute is authoritative and the media query is the fallback for
    // when it is absent, so the attribute is cleared to make the fallback
    // reachable — the same technique 27-motion-guards.spec.js uses.
    const ctx = await browser.newContext({ reducedMotion: 'reduce' })
    const page = await ctx.newPage()
    watch(page, 'a reader whose operating system asks for less motion')
    await go(page, '/')
    await page.evaluate(() => document.documentElement.removeAttribute('data-reduced-motion'))

    await page.locator('.app-footer-note').click()
    await expect(page.locator('.fnote')).toBeVisible()
    const m = await motionOf(page)
    for (const [what, v] of Object.entries(m)) {
      expect(v.animationName, `${what} ignores the OS preference`).toBe('none')
      expect(v.opacity).toBe('1')
      expect(v.transform).toBe('none')
    }
    await ctx.close()
  })

  test('CONTROL · with motion on, the panel really does animate', async ({ browser }) => {
    // Without this the two tests above pass on a panel that was never animated
    // in the first place, and prove nothing. This is also the other direction of
    // the contract: someone who turns motion back ON inside the app keeps it
    // even when their OS says reduce.
    const ctx = await browser.newContext({ reducedMotion: 'reduce' })
    const page = await ctx.newPage()
    watch(page, 'a reader who turned motion back on in Settings')
    await page.addInitScript(() => {
      try { localStorage.setItem('vs-appearance', JSON.stringify({ reducedMotion: false })) } catch { /* private mode */ }
    })
    await go(page, '/')
    expect(await page.evaluate(() => document.documentElement.getAttribute('data-reduced-motion'))).toBe('false')

    await page.locator('.app-footer-note').click()
    await expect(page.locator('.fnote')).toBeVisible()
    const m = await motionOf(page)
    expect(m.overlay.animationName, 'the overlay is expected to fade in when motion is allowed').toBe('cp-fade')
    expect(m.panel.animationName, 'the panel is expected to rise when motion is allowed').toBe('cp-rise')
    await ctx.close()
  })
})

test('a wheel over the note scrolls the note, not the page behind it', async ({ page }) => {
  // Lenis intercepts the wheel for the whole document, so "the popup does not
  // scroll" is the standing failure here and the fix is Lenis's own
  // `allowNestedScroll` plus `data-lenis-prevent` on the real scroll container —
  // not a handler fighting it. `useModalDialog` marks the containers when the
  // dialog opens; this checks the marking landed AND that the gesture obeys it.
  //
  // The note ships short, so tall content is appended to make the body a
  // scroller. The MARKING is content-independent (`.fnote-body` carries
  // `overflow-y:auto` unconditionally, which is what markScrollContainers
  // measures), and that half is asserted first, before anything is injected.
  watch(page, 'a reader wheeling through a long note')
  await go(page, '/')
  await page.locator('.app-footer-note').click()
  await expect(page.locator('.fnote')).toBeVisible()
  // The wheel is aimed at a bounding box, and a rising panel's box is 8px low
  // and 2% narrow while the entrance is still playing.
  await settle(page)

  const marked = await page.evaluate(() => {
    const body = document.querySelector('.fnote-body')
    return {
      prevented: body.hasAttribute('data-lenis-prevent'),
      overscroll: getComputedStyle(body).overscrollBehaviorY,
    }
  })
  expect(marked.prevented, 'the note body must be marked so Lenis lets the gesture through').toBe(true)
  expect(marked.overscroll, 'and contained so it does not hand the remainder to the page').toBe('contain')

  const before = await page.evaluate(() => {
    const body = document.querySelector('.fnote-body')
    const filler = document.createElement('div')
    filler.style.height = '1200px'
    filler.setAttribute('data-test-filler', '')
    body.appendChild(filler)
    return { panel: body.scrollTop, page: window.scrollY, scrollable: body.scrollHeight - body.clientHeight }
  })
  expect(before.scrollable, 'the injected filler must make the body a real scroller').toBeGreaterThan(100)

  const box = await page.locator('.fnote-body').boundingBox()
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
  await page.mouse.wheel(0, 400)
  await page.waitForTimeout(500)

  const after = await page.evaluate(() => ({
    panel: document.querySelector('.fnote-body').scrollTop,
    page: window.scrollY,
  }))
  expect(after.panel, 'the wheel must scroll the note').toBeGreaterThan(before.panel)
  expect(Math.abs(after.page - before.page), 'and must not move the page behind it').toBeLessThan(4)
})

test('the one action is the feedback channel the app already has', async ({ page }) => {
  watch(page, 'a reader who decides to send feedback')
  await go(page, '/')
  await page.locator('.app-footer-note').click()
  const action = page.locator('.fnote-action')
  await expect(action).toHaveAttribute('href', '/feedback')
  await action.click()
  await expect(page).toHaveURL(/\/feedback$/)
  await expect(page.locator('.fnote')).toHaveCount(0)
})

test('at 390px the note is a sheet that fits, and nothing scrolls sideways', async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 3 })
  const page = await ctx.newPage()
  watch(page, 'a reader on a phone')
  await go(page, '/')
  await page.locator('.app-footer-note').click()
  await expect(page.locator('.fnote')).toBeVisible()
  await settle(page)

  const m = await page.evaluate(() => {
    const panel = document.querySelector('.fnote')
    const r = panel.getBoundingClientRect()
    const action = document.querySelector('.fnote-action').getBoundingClientRect()
    return {
      left: Math.round(r.left),
      right: Math.round(r.right),
      bottom: Math.round(r.bottom),
      height: Math.round(r.height),
      actionWidth: Math.round(action.width),
      docOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      inner: window.innerWidth,
    }
  })
  expect(m.left, 'the sheet spans the viewport').toBe(0)
  expect(m.right).toBe(m.inner)
  expect(Math.abs(m.bottom - 844), 'it sits on the bottom edge').toBeLessThan(2)
  expect(m.height, 'and must not exceed the viewport').toBeLessThanOrEqual(844)
  expect(m.actionWidth, 'the action goes full width on a phone').toBeGreaterThan(280)
  expect(m.docOverflow, 'nothing may push the page sideways').toBeLessThanOrEqual(0)
  await ctx.close()
})
