// The 2026-09-11 quality pass over the six COLOUR tools — /create/color,
// /create/palette, /create/semantic-color, /create/tint, /create/gradient and
// /create/contrast — rating every aspect of each out of ten and holding what
// the rating moved.
//
// HOW THE RATINGS WERE TAKEN. Every surface was rendered at 320, 390, 430, 768,
// 1024, 1097, 1120, 1136, 1280, 1440 and 1920, in both themes, with reduced
// motion on and off, signed out, signed in free with a saved project, at the
// free save cap of three, as Pro, with a long project name, and with every
// panel and popover each tool has open — 132 structural cells, 703 text nodes
// measured for contrast per theme, and a tab walk of every stop on every page.
// What that found, and what stayed clean, is in the PR body. Four of the
// findings are held here.
//
// WHAT WAS CLEAN AND IS NOT RE-ASSERTED HERE, because 68-core-tools-breakpoints
// and 64-computed-style-snapshot already own it: zero horizontal overflow in
// any of the 132 cells, zero contrast failures in either theme (the probe was
// mutation-proved on every route by injecting a 2.81:1 node, which it caught
// each time), a visible focus indicator on all 64 tab stops, and no reflow
// break at 200% zoom.
//
// TWO MEASUREMENTS THAT LOOKED LIKE DEFECTS AND WERE NOT, recorded so the next
// sweep does not re-raise them:
//
//   · `.cpk-hue` read 23.6px tall inside a freshly opened picker. The popover
//     rises in at `scale(.985)`; settled on the animation layer it is 24.00px.
//     That is why every measurement below waits for `getAnimations()` to finish
//     rather than for a timeout.
//   · `.ggn-handle` is 20x20 at every width, and CONFORMS: WCAG 2.5.8's
//     Spacing exception applies. Measured on the rendered page, the three
//     handles sit 364.4px apart and the nearest target of any other kind is
//     113.3px away, so a 24px circle centred on each intersects nothing.
//     Enlarging them would put a 24px puck on a 12px track for no gain.
//
// `test` comes from ./base.js, not @playwright/test — that is where Google One
// Tap is stubbed on the browser fixture.
import { test, expect } from './base.js'
import { go, watch, signIn } from './helpers.js'

const IOS_UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1'

/** WCAG 2.2 AA 2.5.8 (Target Size, Minimum). */
const MIN_TARGET = 24

/** A context at an exact width: real touch metrics under 700, a desktop above. */
async function at(browser, width, theme = 'light') {
  const ctx = await browser.newContext(width < 700
    ? { viewport: { width, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true, userAgent: IOS_UA }
    : { viewport: { width, height: 900 } })
  await ctx.addInitScript((t) => { try { localStorage.setItem('vs-t', t) } catch { /* private mode */ } }, theme)
  return { ctx, page: await ctx.newPage() }
}

/**
 * Read only once the page has stopped moving.
 *
 * Not a timeout: `.pop`, `.plb-menu` and this page's own save panel all rise in
 * with a transform, and a rect taken two frames after a click is short by the
 * whole entrance. Waiting on the animation layer itself is the only read that
 * is true both for a viewer with motion and for one without.
 *
 * AN ANIMATION THAT NEVER FINISHES IS NOT AN UNSETTLED ONE, and the first
 * version of this helper did not know the difference, so it timed out on
 * twenty-five of these tests. Two kinds are skipped, both named by what they
 * are rather than by which element carries them:
 *
 *   · Infinite ones. `.stc-scene-ico--spin`, the pending role's turning icon,
 *     declares `iterations: Infinity` and is meant to.
 *   · SCROLL-DRIVEN ones. `.rail-overflow` fades its own edges with
 *     `animation-timeline: scroll(self inline)` — on `.ggn-presets`, on
 *     `.plb-toolbar-group` and on every other overflow rail in the app. Its
 *     progress is a scroll position, not a clock, so `playState` stays
 *     'running' for as long as the rail exists and `getTiming().duration` is
 *     the string 'auto'. Waiting for it is waiting for the user to scroll.
 *
 * What is left is exactly what a measurement has to wait for: the time-driven
 * animations that move a box and stop.
 */
async function settled(page) {
  await page.waitForFunction(
    () => document.getAnimations().every((a) => {
      if (a.playState === 'finished' || a.playState === 'idle') return true
      if (a.timeline && a.timeline !== document.timeline) return true   // scroll/view timeline
      try { return a.effect?.getTiming?.().iterations === Infinity } catch { return true }
    }),
    null, { polling: 'raf', timeout: 6000 },
  )
  await page.evaluate(async () => {
    for (let round = 0; round < 3; round++) {
      await document.fonts.ready
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))
    }
  })
}

/**
 * Every operable control inside `root` that is smaller than 24px in either
 * direction, with the criterion's two documented exceptions applied the same
 * way 58-target-size-24 applies them.
 *
 * A checkbox or radio wrapped in its own <label> is measured by the LABEL: the
 * label is the target, and /create/tint's `.tt-check` is a 13px box inside a
 * 24px label that is entirely clickable. Measuring the input there would report
 * a conforming control as a defect, which is how a check gets switched off.
 */
const UNDERSIZED = ([root, minimum]) => {
  const shown = (el) => {
    const cs = getComputedStyle(el)
    if (cs.display === 'none' || cs.visibility === 'hidden' || parseFloat(cs.opacity) === 0) return false
    return el.getClientRects().length > 0
  }
  const scope = document.querySelector(root)
  if (!scope) return [{ error: `no element matches ${root}` }]
  const out = []
  for (const el of scope.querySelectorAll('a[href], button, [role=button], [role=tab], select, summary, input:not([type=hidden]), textarea')) {
    if (!shown(el) || el.disabled) continue
    if (getComputedStyle(el).pointerEvents === 'none') continue
    // An inert subtree holds no targets — it is a depiction, not a control.
    if (el.closest('[inert]')) continue
    let r = el.getBoundingClientRect()
    const label = el.closest('label')
    if (label && (el.type === 'checkbox' || el.type === 'radio')) r = label.getBoundingClientRect()
    if (r.width < 1 || r.height < 1) continue
    if (r.width >= minimum && r.height >= minimum) continue
    // WCAG 2.5.8 "Inline": a link whose size is constrained by the sentence
    // around it. Inline-level display is part of that and is not optional -
    // a flex or block link sets its own height, so being under 24px there is a
    // decision rather than a constraint. See 58-target-size-24 for the 23
    // homepage measurements the looser form waived.
    if (el.tagName === 'A' && el.parentElement
      && getComputedStyle(el).display.startsWith('inline')
      && (el.parentElement.innerText || '').trim().length > (el.innerText || '').trim().length + 3) continue
    out.push({
      sel: `${el.tagName.toLowerCase()}.${(el.className || '').toString().slice(0, 44)}`,
      name: (el.getAttribute('aria-label') || el.textContent || '').trim().slice(0, 30),
      w: +r.width.toFixed(1), h: +r.height.toFixed(1),
    })
  }
  return out
}

// ─────────────────────────────────────────────────────────────────────────────
// /create/semantic-color — the live-UI-proof scenes
// ─────────────────────────────────────────────────────────────────────────────
//
// The preview renders one real component per semantic role — a switch, a text
// field, an alert with a solid button, an info note with a link-button, an
// activity row — and renders the whole set TWICE, once on a light panel and
// once on a dark one. Nothing in it does anything.
//
// Before this change they were real <input> and <button> elements carrying only
// `tabIndex={-1}`, which takes a control out of the TAB ORDER and leaves it in
// the accessibility tree. A screen reader user met "Project slug, edit text,
// aurora-design-system", "Use anyway, button", "Update card, button" and "Learn
// more, button" — eight operable-sounding controls that go nowhere — and then
// met the identical eight again in the dark copy.
//
// MUTATION: remove `inert` from `.stc-scene-list` in src/pages/ColorStudio.jsx
// and both tests below go red — the first on the two readonly inputs it should
// not see, the second on the sizes. (It was eight controls until 2026-09-14,
// when the three <button> depictions became <span>s; see the note on the
// positive control below.)
test('the semantic-colour preview is a depiction, not eight controls that do nothing', async ({ browser }) => {
  const { ctx, page } = await at(browser, 1440)
  watch(page, 'someone reading this page with a screen reader')
  await go(page, '/create/semantic-color')
  await settled(page)

  // POSITIVE CONTROL: the scenes are on screen and they are the real markup,
  // not a stand-in. Without this a page that failed to render would satisfy
  // every "there is no operable control" assertion trivially.
  const scenes = page.locator('.stc-scene')
  await expect(scenes).toHaveCount(10)          // five roles x light + dark
  await expect(scenes.first()).toBeVisible()
  // TWO, NOT EIGHT, SINCE 2026-09-14 — and the drop is the founder's fix, not a
  // regression. `.stc-sc-ghost`, `.stc-sc-solid` and `.stc-sc-link` were
  // <button>s with tabIndex={-1} drawn INSIDE the specimens; they are <span>s
  // now, because enlarging them to the 24x24 floor was impossible (they are
  // scaled to the miniature they are drawn in) and the honest fix was to stop
  // claiming they are controls at all. Three buttons x the light and dark copy
  // is the six that left. What remains is the two readonly <input>s.
  //
  // The positive control still does its job: it proves the scenes rendered
  // REAL markup rather than a stand-in, so the absence asserted below means
  // something. It just counts a smaller, truer number.
  const drawn = await page.evaluate(() => document.querySelectorAll('.stc-scene-list button, .stc-scene-list input').length)
  expect(drawn, 'the scenes still draw real controls — that is the point of them').toBe(2)

  // THE ASSERTION: neither of those two is exposed as operable.
  const exposed = await page.evaluate(() => {
    const out = []
    for (const el of document.querySelectorAll('.stc-scene-list button, .stc-scene-list input, .stc-scene-list [role=button]')) {
      if (!el.closest('[inert]')) out.push(`${el.tagName.toLowerCase()}.${(el.className || '').toString()}`)
    }
    return out
  })
  expect(exposed, 'a control in the preview is still reachable by assistive technology').toEqual([])

  // And it cannot be reached by pointer either, which is what makes the size
  // question moot rather than merely unasserted.
  const clickable = await page.evaluate(() => {
    const b = document.querySelector('.stc-sc-solid')
    const r = b.getBoundingClientRect()
    const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2)
    return { hit: hit ? `${hit.tagName.toLowerCase()}.${(hit.className || '').toString().slice(0, 30)}` : null, inertAncestor: !!b.closest('[inert]') }
  })
  expect(clickable.inertAncestor, 'the scene stack is not inert').toBe(true)

  await ctx.close()
})

// Every width the sweep covered, in both themes: the page carries no target
// under 24px. Before the change `.stc-sc-ghost` (71.7x21.0) and `.stc-sc-link`
// (54.3x14.0) were present in all 22 cells, and the Load chips added two more
// in every signed-in cell.
for (const width of [320, 390, 430, 768, 1024, 1097, 1120, 1136, 1280, 1440, 1920]) {
  test(`/create/semantic-color has no target under 24px at ${width}`, async ({ browser }) => {
    const { ctx, page } = await at(browser, width)
    watch(page, 'someone using this on a phone, pressing with a thumb')
    await signIn(page, { plan: 'free', projects: 2 })
    await go(page, '/create/semantic-color')
    await settled(page)

    // POSITIVE CONTROL: the measurement examined a real number of controls.
    const examined = await page.evaluate(() => document.querySelectorAll('main a[href], main button, main input, main select').length)
    expect(examined, `${width}: nothing to measure`).toBeGreaterThan(40)

    const small = await page.evaluate(UNDERSIZED, ['main', MIN_TARGET])
    expect(small, `${width}: control(s) under ${MIN_TARGET}px`).toEqual([])
    await ctx.close()
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// /create/semantic-color — the Add-to-Project disclosure
// ─────────────────────────────────────────────────────────────────────────────
//
// The panel held none of the contract `src/hooks/usePopover.js` exists to give:
// its trigger carried no aria-expanded, aria-controls or aria-haspopup, Escape
// did not close it, and a press anywhere else on the page did not close it
// either — measured 2026-09-11, both still open afterwards. It also covered the
// Material and Tailwind bundle cards while it was stuck open.
//
// MUTATION: drop `usePopover` back out of ColorStudio.jsx (restore the bare
// `setSaveMenuOpen(!saveMenuOpen)` trigger with no aria) and all three tests
// below go red.
test('the Add-to-Project panel says it is open, and closes the two ways a popover must', async ({ browser }) => {
  const { ctx, page } = await at(browser, 1440)
  watch(page, 'someone saving a state palette into a project, by keyboard')
  await signIn(page, { plan: 'free', projects: 2 })
  await go(page, '/create/semantic-color')
  await settled(page)

  const trigger = page.locator('.stc-save-trigger')
  await expect(trigger).toBeVisible()
  // POSITIVE CONTROL: shut, the trigger says so rather than saying nothing.
  await expect(trigger).toHaveAttribute('aria-expanded', 'false')
  await expect(trigger).toHaveAttribute('aria-haspopup', 'dialog')

  await trigger.click()
  await settled(page)
  await expect(trigger).toHaveAttribute('aria-expanded', 'true')
  const controls = await trigger.getAttribute('aria-controls')
  await expect(page.locator(`#${controls}`)).toBeVisible()

  // Escape closes it AND hands focus back to the trigger — dropping focus to
  // <body> is the half that gets forgotten, and some screen readers announce it
  // as a page change.
  await page.keyboard.press('Escape')
  await settled(page)
  await expect(page.locator('.stc-save-panel')).toHaveCount(0)
  await expect(trigger).toHaveAttribute('aria-expanded', 'false')
  expect(await page.evaluate(() => document.activeElement?.className || ''),
    'Escape closed the panel but dropped focus').toContain('stc-save-trigger')

  // A press outside closes it too.
  await trigger.click()
  await settled(page)
  await expect(page.locator('.stc-save-panel')).toBeVisible()
  await page.mouse.click(20, 500)
  await settled(page)
  await expect(page.locator('.stc-save-panel')).toHaveCount(0)

  await ctx.close()
})

test('the project-name field has a name, not only a placeholder', async ({ browser }) => {
  const { ctx, page } = await at(browser, 1440)
  watch(page, 'someone naming a project with a screen reader on')
  await signIn(page, { plan: 'free', projects: 1 })
  await go(page, '/create/semantic-color')
  await settled(page)
  await page.locator('.stc-save-trigger').click()
  await settled(page)

  const field = page.locator('.stc-save-input')
  await expect(field).toBeVisible()
  // POSITIVE CONTROL: it is the field that takes the name, not some other input.
  await expect(field).toHaveAttribute('placeholder', 'Project name...')
  // THE ASSERTION. A placeholder is not an accessible name: it is removed from
  // the box the moment a character is typed, and several screen readers do not
  // announce it at all.
  expect(await field.evaluate((el) => {
    const byFor = el.id && document.querySelector(`label[for="${CSS.escape(el.id)}"]`)
    return el.getAttribute('aria-label') || el.getAttribute('aria-labelledby') || (el.closest('label') ? 'wrapping-label' : '') || (byFor ? 'label-for' : '')
  }), 'the only thing naming this field is its placeholder').toBe('Project name')

  await ctx.close()
})

// ─────────────────────────────────────────────────────────────────────────────
// /create/semantic-color — the free cap's refusal
// ─────────────────────────────────────────────────────────────────────────────
//
// It went out through `toast?.(err.message)`, which is the SUCCESS toast.
// Measured 2026-09-11 signed in free with three saved projects: the class was
// `toast toast-success show`, the ground was white, the message read "Free plan
// saves up to 3 projects — go Pro for unlimited.", it held for 1.8 seconds and
// there was nothing to press. That is the fault #436 named and #437 fixed on
// the Palette Builder and on /projects; this page still had it.
//
// MUTATION: put `toast?.(err.message)` back in `commitSaveProject` and this
// goes red on the missing inline refusal.
test('at the free cap the refusal stays under the field, with a way to Pro', async ({ browser }) => {
  const { ctx, page } = await at(browser, 1440)
  watch(page, 'a free user who has already saved three projects')
  await signIn(page, { plan: 'free', projects: 3 })   // the cap is 3 (config/plans.js)
  await go(page, '/create/semantic-color')
  await settled(page)
  await page.locator('.stc-save-trigger').click()
  await settled(page)

  // POSITIVE CONTROL: a save is actually attempted. Without a name typed the
  // commit returns early and nothing below would mean anything.
  await page.locator('.stc-save-input').fill('A fourth project')
  await expect(page.locator('.stc-save-input')).toHaveValue('A fourth project')
  await page.locator('.stc-save-go').click()
  await settled(page)

  const refusal = page.locator('[data-testid="semantic-save-refusal"]')
  await expect(refusal).toBeVisible()
  // ProjectContext's own words, not a sentence written here.
  await expect(refusal).toContainText('Free plan saves up to 3 projects')
  await expect(refusal).toHaveAttribute('role', 'alert')
  await expect(refusal.locator('a[href="/plans"]')).toBeVisible()

  // The panel stays open with the name still in it — the user has not lost
  // their typing to a refusal.
  await expect(page.locator('.stc-save-panel')).toBeVisible()
  await expect(page.locator('.stc-save-input')).toHaveValue('A fourth project')

  // And the refusal is NOT also delivered as a success.
  const toast = await page.evaluate(() => {
    const t = document.querySelector('.toast')
    return t ? { cls: t.className, text: (t.querySelector('.toast-msg')?.textContent || '').trim() } : null
  })
  expect(toast?.text || '', 'the cap refusal is still going out as a toast as well').not.toContain('Free plan saves')
  if (toast) expect(toast.cls, 'a refusal is showing in the success toast').not.toMatch(/toast-success.*\bshow\b/)

  await ctx.close()
})

// ─────────────────────────────────────────────────────────────────────────────
// /create/gradient — the stop's hex field
// ─────────────────────────────────────────────────────────────────────────────
//
// A real editable text field, 17.0px tall above 640 and 21.0px below it, at
// every width in both themes. Neither of 2.5.8's exceptions reaches an <input>
// flanked by two adjacent controls.
//
// MUTATION: drop `min-height:24px` from `input.ggn-stop-hex` in
// src/styles/global.css and every width below goes red.
for (const width of [320, 390, 430, 768, 1024, 1097, 1120, 1136, 1280, 1440, 1920]) {
  test(`the gradient stop's hex field is at least 24px tall at ${width}`, async ({ browser }) => {
    const { ctx, page } = await at(browser, width)
    watch(page, 'someone typing a hex into a gradient stop on a phone')
    await go(page, '/create/gradient')
    await settled(page)

    // POSITIVE CONTROL: there are three stops on a fresh gradient and each one
    // has its own field, so a page that rendered no stops cannot pass.
    const fields = page.locator('input.ggn-stop-hex')
    await expect(fields).toHaveCount(3)
    await expect(fields.first()).toBeVisible()

    const boxes = await page.evaluate(() => [...document.querySelectorAll('input.ggn-stop-hex')].map((el) => {
      const r = el.getBoundingClientRect()
      return { name: el.getAttribute('aria-label'), w: +r.width.toFixed(1), h: +r.height.toFixed(1) }
    }))
    for (const b of boxes) {
      expect(b.h, `${width}: ${b.name} is ${b.h}px tall`).toBeGreaterThanOrEqual(MIN_TARGET)
    }

    // The fix must not have cost the field its width — the hex is 67.2px of
    // text in an 80.0px box at 320, and clipping it renders a plausible but
    // WRONG colour ("#7C3AED" as "#7C3AE"), which is the fault the rule's own
    // note records.
    const clipped = await page.evaluate(() => [...document.querySelectorAll('input.ggn-stop-hex')]
      .filter((el) => el.scrollWidth > el.clientWidth).map((el) => `${el.getAttribute('aria-label')} ${el.scrollWidth}>${el.clientWidth}`))
    expect(clipped, `${width}: the hex value is clipped`).toEqual([])

    await ctx.close()
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// What the sweep found clean, held so a later change cannot quietly undo it
// ─────────────────────────────────────────────────────────────────────────────
//
// /create/palette, /create/tint and /create/contrast came out of the sweep with
// nothing under 24px at any width in either theme. That is worth ONE assertion
// rather than none: they are the three surfaces most likely to grow a control
// next, and each has a class of control the others do not (a swatch toolbar, a
// ramp cell grid, a fix row).
for (const route of ['/create/palette', '/create/tint', '/create/contrast']) {
  test(`${route} carries no target under 24px at 390 and 1440`, async ({ browser }) => {
    for (const width of [390, 1440]) {
      const { ctx, page } = await at(browser, width)
      watch(page, 'someone using this on a phone, pressing with a thumb')
      await go(page, route)
      await settled(page)
      const examined = await page.evaluate(() => document.querySelectorAll('main a[href], main button, main input, main select').length)
      expect(examined, `${route} @${width}: nothing to measure`).toBeGreaterThan(5)
      const small = await page.evaluate(UNDERSIZED, ['main', MIN_TARGET])
      expect(small, `${route} @${width}: control(s) under ${MIN_TARGET}px`).toEqual([])
      await ctx.close()
    }
  })
}
