// Acceptance coverage for the homepage: every live tool route reachable, the
// command bar over the REAL search index, the five-mode mini-workbench (now
// housed in the V2 sticky-scroll section), and the two in-memory hand-offs
// (images → File Converter, icon draft → Icon Editor).
//
// V2 REDESIGN (feat/v2-homepage) genuinely changed three behaviours, and the
// assertions below moved WITH them rather than being deleted:
//
//   · The eleven hero satellites became the tools grid. The contract is
//     unchanged in substance — every one of those eleven routes must still be
//     reachable from the homepage with a real href — so the same table is now
//     asserted against `.htool-link`. The grid is a SUPERSET: it also exposes
//     /create/emoji and the AI + component routes the old hero never linked, so no
//     route was orphaned by the redesign.
//   · The satellite → workbench convergence is gone, and nothing decorative
//     replaced it. The sticky step sync took its place, and it moves REAL
//     workbench state rather than aria-hidden proxy chips — so it is asserted
//     on the panel's own selected mode, which is a stronger check than
//     counting proxies ever was.
//   · The hero's primary CTA is the V2 accent pill, not the ink pill.
//
// Everything about the five panels themselves — state, clipboard, keyboard,
// ARIA, hand-offs — is untouched, and so are their tests.
//
// Numbers in the test titles refer to the acceptance list in
// the homepage acceptance contract (retired to git history in #204 — this file
// IS the contract now; its unmet performance budgets moved to the
// homepage-field-metrics item in src/data/pipeline.js).
import { test, expect } from './base.js'
import { watch, go, restAfterMove } from './helpers.js'

const PERSONA = 'designer evaluating the workspace from the homepage'

// The eleven routes the pre-V2 hero exposed. Every one must still be reachable
// from the homepage — that is the half of the contract that did not change.
const SATELLITES = [
  ['Palette', '/create/palette'],
  ['Semantic', '/create/semantic-color'],
  ['Tint', '/create/tint'],
  ['Gradient Generator', '/create/gradient'],
  ['Contrast', '/create/contrast'],
  ['Icon Library', '/create/icons'],
  ['File Converter', '/create/file-converter'],
  ['Aspect & Resolution', '/create/aspect-ratio'],
  ['Font Gallery', '/create/font-gallery'],
  ['Font Pair', '/create/font-pair'],
  ['Type Scale', '/create/type-scale'],
]

const TABS = ['Palette', 'Gradient', 'Image', 'Icon', 'Typography']

async function reducedMotion(page) {
  await page.addInitScript(() => {
    localStorage.setItem('vs-appearance', JSON.stringify({
      rounding: 'default', density: 'cozy', reducedMotion: true,
    }))
  })
}

// The inverse, for the three hero-placeholder tests below.
//
// This describe runs the whole file under `reducedMotion: 'reduce'`, which is
// right for every other test in it and fatal for those three. An EXPLICIT
// in-app choice beats the OS query in both directions — that is
// AppearanceContext's documented contract, guarded by
// tests/unit/reduced-motion-resolution.test.js — so storing `false` is how a
// motion-on visitor is simulated without changing the file's configuration for
// anything else in it.
async function motionOn(page) {
  await page.addInitScript(() => {
    localStorage.setItem('vs-appearance', JSON.stringify({
      rounding: 'default', density: 'cozy', reducedMotion: false,
    }))
  })
}

// The caret the hero placeholder types behind, U+258F. Duplicated from
// HomeCommandBar.jsx deliberately: a test that imported the constant would
// still pass if the constant were changed to a space.
const CARET = '▏'

// Every distinct value the hero placeholder takes over `ms`. Polls inside the
// page rather than round-tripping per sample, so a 55ms-per-character animation
// is actually caught. NOT a waitForTimeout stand-in for "wait until this
// exists" — the callers above wait on `expect.poll` for that, and this measures
// how a value CHANGES over a window, which is the thing under test.
async function samplePlaceholder(page, ms) {
  return page.evaluate(async (duration) => {
    const input = document.querySelector('.hcmd-input')
    const seen = []
    const end = performance.now() + duration
    while (performance.now() < end) {
      const value = input.placeholder
      if (seen[seen.length - 1] !== value) seen.push(value)
      await new Promise((resolve) => { setTimeout(resolve, 25) })
    }
    return seen
  }, ms)
}

const png = (name) => ({
  name,
  mimeType: 'image/png',
  // A 1×1 transparent PNG — real bytes, no encoding work.
  buffer: Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
    'base64',
  ),
})

const overflowOf = (page) => page.evaluate(
  () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
)

// Records every programmatic window.scrollTo so a test can prove HOW the page
// moved (instant vs smooth), not just where it ended up. Lenis owns the scroll
// when motion is on, so this only sees the app's own calls.
async function spyOnScrollTo(page) {
  await page.addInitScript(() => {
    window.__scrollCalls = []
    const native = window.scrollTo.bind(window)
    window.scrollTo = (...args) => {
      const opts = args[0]
      if (opts && typeof opts === 'object') {
        window.__scrollCalls.push({ top: opts.top || 0, behavior: opts.behavior || 'auto' })
      } else {
        window.__scrollCalls.push({ top: args[1] || 0, behavior: 'auto' })
      }
      return native(...args)
    }
  })
}

const scrollCalls = (page) => page.evaluate(() => window.__scrollCalls || [])

// Where the converter's queue region sits relative to the fixed PillNav and the
// viewport, plus what holds focus.
const converterView = (page) => page.evaluate(() => {
  const box = (sel) => {
    const el = document.querySelector(sel)
    if (!el) return null
    const r = el.getBoundingClientRect()
    return { top: r.top, bottom: r.bottom, height: r.height }
  }
  const queue = document.querySelector('.fc-queue')
  return {
    scrollY: Math.round(window.scrollY),
    viewport: window.innerHeight,
    navBottom: document.querySelector('.pnav')?.getBoundingClientRect().bottom ?? 0,
    queue: box('.fc-queue'),
    card: box('.fc-card'),
    drop: box('.fc-drop'),
    focusedQueue: !!queue && document.activeElement === queue,
    focusLabel: document.activeElement?.getAttribute('aria-label') || null,
  }
})

// Drive the homepage Image panel's "Try your image" hand-off.
async function handOffImages(page, files) {
  await page.locator('.hw-tab[data-tab="image"]').click()
  await page.locator('.hw-body input[type="file"]').setInputFiles(files)
  await page.waitForURL('**/create/file-converter')
}

test.describe('homepage: eleven tools, five ways of working', () => {
  test.use({ reducedMotion: 'reduce' })

  // FOUNDER REPORT: "the mini tools are visible before scrolling." The hero was
  // a flat `min-height: 720px`, so on any viewport taller than that the
  // workbench sat in the opening screen and the hero never got a screen of its
  // own. A pixel height cannot answer this, because the fold is a property of
  // the VIEWPORT — the hero now claims `min(100svh, 980px)`.
  //
  // Asserted with full motion ON and at real laptop heights, because that is
  // the condition the report came from. The ≤768px and reduced-motion layouts
  // deliberately collapse to the calm static arrangement (test 6) and are
  // excluded: there the workbench SHOULD follow directly, since there is no
  // convergence to stage.
  for (const [w, h] of [[1440, 900], [1512, 982], [1920, 1080], [1280, 800]]) {
    test(`the workbench starts below the fold at ${w}×${h}`, async ({ page }) => {
      await page.setViewportSize({ width: w, height: h })
      watch(page, PERSONA)
      await go(page, '/')

      const shell = page.locator('.hw-shell')
      await expect(shell).toBeVisible()          // present and usable, just not yet on screen
      const box = await shell.boundingBox()
      expect(box, 'the workbench must exist in layout').not.toBeNull()
      expect(
        box.y,
        `the workbench top (${Math.round(box.y)}px) must start below a ${h}px viewport`,
      ).toBeGreaterThanOrEqual(h)

      // …and the hero's own call to action is still ON screen, so pushing the
      // workbench down must not push the primary action down with it.
      const cta = page.locator('.home-hero-cta .ui-pill-accent')
      const ctaBox = await cta.boundingBox()
      expect(ctaBox.y + ctaBox.height, 'the primary CTA must stay above the fold').toBeLessThan(h)
    })
  }

  test('1–4 · the promise, the eleven links and exactly five tabs', async ({ page }) => {
    await reducedMotion(page)
    watch(page, PERSONA)
    await go(page, '/')

    // 1 · the hero's promise, its one mark, and the introduced command bar.
    //
    // ─────────────────────────────────────────────────────────────────────────
    // THIS BLOCK USED TO PIN THE SENTENCES. It asserted the h1 read "Every
    // design tool, / one search box away.", that the mark sat on the words
    // "search box", and that the sub-copy said "Type what you need".
    //
    // Those strings came from a founder instruction on 2026-08-16, and the
    // instruction behind them was sound: before it, the command bar arrived
    // unannounced and the --hi mark "pointed at nothing". The strings were one
    // way to satisfy that. Pinning THEM rather than the property meant the
    // contract failed on any copy edit — including the one that produced this
    // change, where a user told the founder the page read instantly as "an
    // AI-generated website" and the headline was part of why.
    //
    // So this now pins the PROPERTIES that instruction was really about, plus
    // the one claim the new copy makes. Copy stays free to move; the hero
    // cannot quietly go back to having an unexplained input in it.
    // ─────────────────────────────────────────────────────────────────────────
    const heading = page.getByRole('heading', { level: 1 })

    // Exactly one mark, and it highlights a phrase that is actually in the
    // headline — a mark on an empty or duplicated span is the original bug.
    const mark = heading.locator('.home-mark')
    await expect(mark).toHaveCount(1)
    const marked = (await mark.innerText()).trim()
    expect(marked.length, 'the mark highlights nothing').toBeGreaterThan(2)
    expect((await heading.innerText()).includes(marked)).toBe(true)

    // The headline names what the product makes. Not a pinned sentence — a
    // check that it is about this product rather than about a category, which
    // is the failure the rewrite was for.
    await expect(heading).toContainText(/colour|color|type|token|system/i)

    // ── The bar's two framing lines are gone; its accessible name is not ─────
    //
    // THIS BLOCK USED TO ASSERT THE OPPOSITE. It required a visible
    // `.home-hero-searchlabel` above the bar, required the bar to sit below it,
    // and required the input's accessible name to equal that visible line. All
    // three came from the 2026-08-16 instruction that the bar must be
    // introduced rather than arriving unannounced.
    //
    // On 2026-09-03 the founder removed both framing lines — "remove the try
    // line below it remove the seacrh every tool line above it" — and the
    // introduction moved INTO the bar itself: the `>` prompt says it is a
    // command line, and the placeholder types real tool names to say what is in
    // it. So these assertions are rewritten to the new contract rather than
    // deleted, and the half of the old contract that is an ACCESSIBILITY
    // GUARANTEE rather than a layout preference is pinned harder than before.
    await expect(page.locator('.home-hero-searchlabel'),
      'the "Search every tool" line above the bar is back').toHaveCount(0)
    await expect(page.locator('.hcmd-chips'),
      'the "Try …" chip row below the bar is back').toHaveCount(0)

    // Removing the visible line is a design choice. Removing the accessible
    // name with it is a WCAG 4.1.2 failure — an unlabelled edit field in the
    // middle of a heading — and no screenshot would ever show it, which is
    // exactly why it is asserted here. Resolved the way a browser resolves it.
    const named = await page.evaluate(() => {
      const input = document.querySelector('.hcmd-input')
      const by = input.getAttribute('aria-labelledby')
      const from = by ? document.getElementById(by) : null
      return {
        name: ((by ? from?.textContent : input.getAttribute('aria-label')) || '').trim(),
        resolves: by ? !!from : true,
        painted: from ? from.getBoundingClientRect().width > 1 : false,
      }
    })
    expect(named.resolves, 'aria-labelledby points at an id that is not on the page').toBe(true)
    expect(named.name.length, 'the hero search box has no accessible name at all').toBeGreaterThan(3)
    // …and whatever carries that name is not painted, which is the founder's
    // half of the same change. Both halves, or the next edit satisfies one by
    // breaking the other — which is how this regression would arrive.
    expect(named.painted, 'the search label is being painted again').toBe(false)

    // ── The furniture that made the page read as generic must not come back ──
    // Each of these was on the page and was removed for a stated reason (see
    // the notes in src/pages/Home.jsx). They are cheap to reintroduce by habit,
    // which is exactly why they are pinned.
    await expect(page.locator('.home-hero-stats'), 'the hero stat strip is back').toHaveCount(0)
    const heroText = await page.locator('.home-hero').innerText()
    expect(heroText, 'the hero opens on the reader\'s pain again').not.toMatch(/stop hunting|tired of|no more/i)
    const bracketed = await page.locator('main').innerText()
    expect(bracketed, 'the bracketed [ SECTION ] eyebrow motif is back').not.toMatch(/\[\s*(CREATE|THE TOOLSET|COMMUNITY|PRICING)\s*\]/i)

    // 2 · every route the old hero exposed is still reachable, with a real
    // href — that is what makes open-in-new-tab and copy-link behave. They now
    // live in the tools grid rather than the satellite field.
    for (const [label, href] of SATELLITES) {
      const link = page.locator(`.htool-link[href="${href}"]`)
      await expect(link, `${label} (${href}) must still be reachable`).toHaveCount(1)
    }

    // …and the grid is a superset: the redesign orphaned nothing and added the
    // routes the constellation never had room for.
    for (const href of ['/create/emoji', '/create/alt-text', '/create/component-designer', '/create/box-shadow']) {
      await expect(page.locator(`.htool-link[href="${href}"]`)).toHaveCount(1)
    }

    // Six category cards, one per Create group.
    await expect(page.locator('.htool')).toHaveCount(6)

    // Source order is the reading order: hero copy, the command bar, the live
    // workbench, then the full grid.
    const order = await page.evaluate(() => {
      const pos = (sel) => {
        const el = document.querySelector(sel)
        return [...document.querySelectorAll('*')].indexOf(el)
      }
      return {
        copy: pos('.home-hero-core'),
        cmd: pos('.hcmd'),
        bench: pos('.hw-shell'),
        grid: pos('.htools-grid'),
      }
    })
    expect(order.copy).toBeLessThan(order.cmd)
    expect(order.cmd).toBeLessThan(order.bench)
    expect(order.bench).toBeLessThan(order.grid)

    // 3 · exactly five primary tabs, in the approved order.
    const tabs = page.locator('.hw-tab')
    await expect(tabs).toHaveCount(5)
    expect(await tabs.allInnerTexts()).toEqual(TABS)
    await expect(tabs.first()).toHaveAttribute('aria-selected', 'true')

    // 4 · the satellites that are NOT workbench modes never become tabs.
    for (const label of ['Semantic', 'Tint', 'Contrast', 'File Converter', 'Aspect & Resolution']) {
      await expect(page.locator('.hw-tab', { hasText: label })).toHaveCount(0)
    }
  })

  test('3 · the tablist follows the ARIA keyboard pattern', async ({ page }) => {
    await reducedMotion(page)
    watch(page, PERSONA)
    await go(page, '/')

    const tab = (name) => page.locator(`.hw-tab[data-tab="${name}"]`)
    await tab('palette').focus()
    // One roving tab stop: only the selected tab is reachable with Tab.
    expect(await page.locator('.hw-tab[tabindex="0"]').count()).toBe(1)

    await tab('palette').press('ArrowRight')
    await expect(tab('gradient')).toBeFocused()
    await expect(tab('gradient')).toHaveAttribute('aria-selected', 'true')

    await tab('gradient').press('End')
    await expect(tab('typography')).toBeFocused()
    await expect(tab('typography')).toHaveAttribute('aria-selected', 'true')

    await tab('typography').press('Home')
    await expect(tab('palette')).toBeFocused()
    await expect(tab('palette')).toHaveAttribute('aria-selected', 'true')

    await tab('palette').press('ArrowLeft')
    await expect(tab('typography')).toBeFocused()

    // Tab moves into the active panel; Shift+Tab comes back to the tab stop.
    await tab('icon').press('Home')
    await tab('palette').press('Tab')
    const insidePanel = await page.evaluate(
      () => !!document.querySelector('.hw-panel')?.contains(document.activeElement),
    )
    expect(insidePanel).toBe(true)
    await page.keyboard.press('Shift+Tab')
    await expect(tab('palette')).toBeFocused()
  })

  test('5 · a failed GSAP chunk leaves the hero, links and workbench usable', async ({ page }) => {
    // Motion enabled, then the motion chunks are blocked outright.
    await page.emulateMedia({ reducedMotion: 'no-preference' })
    await page.addInitScript(() => {
      localStorage.setItem('vs-appearance', JSON.stringify({
        rounding: 'default', density: 'cozy', reducedMotion: false,
      }))
    })
    await page.route(/\/assets\/(gsap|ScrollTrigger)-[^/]+\.js$/, (route) => route.abort())
    watch(page, 'visitor whose motion chunk never arrives')
    await go(page, '/')

    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    await expect(page.locator('.htool-link').first()).toBeVisible()
    await expect(page.locator('.hcmd-input')).toBeVisible()
    await expect(page.locator('.hw-shell')).toBeVisible()
    await expect(page.locator('.hw-panel')).toBeVisible()

    // The hero is not merely present in the DOM — it is fully OPAQUE. This used
    // to be a check for a stranded `.motion-armed` class, because the headline
    // was held at opacity:0 by JS until the GSAP chunk arrived and a failed
    // chunk could leave it invisible forever. The entrance is CSS keyframes now,
    // so no chunk can strand it; assert the property that actually matters
    // rather than the absence of a class that no longer exists.
    await expect.poll(async () => {
      return page.evaluate(() => {
        const els = ['.home-hero-h1', '.home-hero-sub', '.hcmd', '.home-hero-cta', '.home-hero-hint']
          .map((s) => document.querySelector(s))
          .filter(Boolean)
        // The animated units are the CTA's children, not the flex row itself.
        els.push(...document.querySelectorAll('.home-hero-cta > *, .home-hero-line-in'))
        return els.every((el) => Number(getComputedStyle(el).opacity) === 1)
      })
    }, { timeout: 8000 }).toBe(true)

    // No step may be stranded at the inactive opacity when the sync that would
    // activate it never loaded. This is the V2 equivalent of the old stranded
    // `.motion-armed` check, and it is the failure mode that matters most:
    // the narrative is prose, and prose must never depend on a chunk.
    const stepOpacities = await page.locator('.hstep').evaluateAll(
      (steps) => steps.map((el) => Number(getComputedStyle(el).opacity)),
    )
    expect(stepOpacities.length).toBe(5)
    expect(Math.max(...stepOpacities), 'at least one step must be fully legible').toBe(1)

    // Everything still operates: the tablist is the authoritative mode control
    // whether or not the scroll sync ever arrives.
    await page.locator('.hw-tab[data-tab="gradient"]').click()
    await expect(page.locator('.hw-grad-preview')).toBeVisible()
    await page.locator('.htool-link').first().focus()
    await expect(page.locator('.htool-link').first()).toBeFocused()

    // And the command bar is plain React — it never waited on GSAP.
    await page.locator('.hcmd-input').fill('contrast')
    await expect(page.locator('.hcmd-row').first()).toBeVisible()
  })

  test('6 · reduced motion and ≤768px use the calm static arrangement', async ({ page }) => {
    await reducedMotion(page)
    watch(page, PERSONA)
    await go(page, '/')

    // Reduced motion never runs the step sync, so nothing may depend on it:
    // the panel is not sticky, and EVERY step reads at full opacity rather
    // than sitting at the inactive .4 forever.
    const view = await page.evaluate(() => ({
      sticky: getComputedStyle(document.querySelector('.hsteps-sticky')).position,
      opacities: [...document.querySelectorAll('.hstep')]
        .map((el) => Number(getComputedStyle(el).opacity)),
    }))
    expect(view.sticky).toBe('static')
    expect(view.opacities).toEqual([1, 1, 1, 1, 1])

    await page.setViewportSize({ width: 768, height: 900 })
    await go(page, '/')
    expect(
      await page.locator('.hsteps-sticky').evaluate((el) => getComputedStyle(el).position),
    ).toBe('static')
    const narrow = await page.locator('.hstep').evaluateAll(
      (steps) => steps.map((el) => Number(getComputedStyle(el).opacity)),
    )
    expect(narrow).toEqual([1, 1, 1, 1, 1])
    expect(await overflowOf(page)).toBeLessThanOrEqual(1)
  })

  test('7 · holds from 320px to 4K with no overflow, collision or clipped label', async ({ page }) => {
    await reducedMotion(page)
    watch(page, PERSONA)

    for (const width of [320, 380, 480, 768, 980, 1440, 3840]) {
      await page.setViewportSize({ width, height: width < 700 ? 780 : 900 })
      await go(page, '/')
      await expect(page.locator('.hw-shell')).toBeVisible()

      expect(await overflowOf(page), `page overflow at ${width}px`).toBeLessThanOrEqual(1)

      const report = await page.evaluate(() => {
        const links = [...document.querySelectorAll('.htool-link')]
        const clipped = links
          .filter((a) => a.scrollWidth > a.clientWidth + 1)
          .map((a) => a.textContent)
        const boxes = links.map((a) => a.getBoundingClientRect())
        const collisions = []
        for (let i = 0; i < boxes.length; i++) {
          for (let j = i + 1; j < boxes.length; j++) {
            const a = boxes[i]; const b = boxes[j]
            const hit = !(a.right <= b.left || b.right <= a.left || a.bottom <= b.top || b.bottom <= a.top)
            if (hit) collisions.push([i, j])
          }
        }
        // The command bar is the hero's primary control at every width.
        const cmd = document.querySelector('.hcmd-input')?.getBoundingClientRect()
        return {
          clipped,
          collisions,
          count: links.length,
          cmdWidth: cmd ? Math.round(cmd.width) : 0,
        }
      })
      // Every Create tool, live or Soon — the grid never hides a route.
      expect(report.count, `tool links at ${width}px`).toBe(18)
      expect(report.clipped, `clipped tool labels at ${width}px`).toEqual([])
      expect(report.collisions, `tool link collisions at ${width}px`).toEqual([])
      expect(report.cmdWidth, `command bar unusable at ${width}px`).toBeGreaterThan(120)

      // Every control in the default panel stays inside the viewport.
      const reachable = await page.evaluate(() => {
        const controls = [...document.querySelectorAll('.hw-panel button, .hw-panel a, .hw-panel select, .hw-panel input')]
        return controls
          .filter((el) => !el.classList.contains('sr-only'))
          .every((el) => {
            const r = el.getBoundingClientRect()
            return r.left >= -1 && r.right <= document.documentElement.clientWidth + 1
          })
      })
      expect(reachable, `unreachable control at ${width}px`).toBe(true)
    }
  })

  test('5–7 · the sticky panel holds and the step sync drives the REAL workbench', async ({ page }) => {
    // Motion ON: the sticky column and the scroll sync only exist on this path,
    // so the reduced-motion sweep above cannot cover them.
    await page.emulateMedia({ reducedMotion: 'no-preference' })
    await page.addInitScript(() => {
      localStorage.setItem('vs-appearance', JSON.stringify({
        rounding: 'default', density: 'cozy', reducedMotion: false,
      }))
    })
    watch(page, 'motion-enabled product evaluator')

    for (const width of [1440, 3840]) {
      await page.setViewportSize({ width, height: 900 })
      await go(page, '/')
      await expect(page.locator('.hw-shell')).toBeVisible()

      const layout = await page.evaluate(() => {
        const sticky = document.querySelector('.hsteps-sticky')
        const rail = document.querySelector('.hsteps-rail')
        const s = sticky.getBoundingClientRect()
        const r = rail.getBoundingClientRect()
        return {
          position: getComputedStyle(sticky).position,
          // Two real columns: the panel sits beside the narrative, not under it.
          sideBySide: s.left >= r.right - 1,
          panelInside: s.left >= 0 && s.right <= document.documentElement.clientWidth + 1,
        }
      })
      expect(layout.position, `sticky column at ${width}px`).toBe('sticky')
      expect(layout.sideBySide, `columns collapsed at ${width}px`).toBe(true)
      expect(layout.panelInside, `the panel left the viewport at ${width}px`).toBe(true)
      expect(await overflowOf(page)).toBeLessThanOrEqual(1)

      if (width === 1440) {
        // The sync moves REAL product state. Scrolling the Typography step into
        // the band must select the Typography MODE of the live workbench — the
        // panel body genuinely swaps, which is what the old decorative
        // convergence only implied.
        await page.locator('.hstep[data-step="typography"]').scrollIntoViewIfNeeded()
        await expect.poll(
          () => page.locator('.hw-tab[data-tab="typography"]').getAttribute('aria-selected'),
          { timeout: 10000 },
        ).toBe('true')
        await expect(page.locator('.hw-type-preview')).toBeVisible()
        // The active step is the legible one; the rest recede.
        await expect(page.locator('.hstep[data-step="typography"]')).toHaveAttribute('data-active', 'true')

        // Scrolling back up walks the modes back rather than sticking.
        await page.locator('.hstep[data-step="gradient"]').scrollIntoViewIfNeeded()
        await expect.poll(
          () => page.locator('.hw-tab[data-tab="gradient"]').getAttribute('aria-selected'),
          { timeout: 10000 },
        ).toBe('true')

        // …and once the visitor drives the tablist themselves, scroll stops
        // overriding them. A control that keeps changing back is unusable.
        await page.locator('.hw-tab[data-tab="icon"]').click()
        await page.locator('.hstep[data-step="typography"]').scrollIntoViewIfNeeded()
        await page.waitForTimeout(700)
        await expect(page.locator('.hw-tab[data-tab="icon"]')).toHaveAttribute('aria-selected', 'true')
      }
    }
  })

  test('the command bar searches the real registry and never invents a route', async ({ page }) => {
    await reducedMotion(page)
    watch(page, 'visitor looking for one specific tool')
    await go(page, '/')

    const input = page.locator('.hcmd-input')
    // Empty is empty: no results panel until there is a query.
    await expect(page.locator('.hcmd-results')).toHaveCount(0)

    await input.fill('contrast')
    const rows = page.locator('.hcmd-row')
    await expect(rows.first()).toBeVisible()

    // Every row is a real link to a route the router actually has — the mock's
    // invented /tools/* hrefs must never appear.
    const hrefs = await rows.evaluateAll((els) => els.map((el) => el.getAttribute('href')))
    expect(hrefs.length).toBeGreaterThan(0)
    for (const href of hrefs) {
      expect(href, 'a fabricated route reached the results panel').toMatch(/^\//)
      expect(href).not.toContain('/tools/')
    }

    // A query with no match says so instead of showing a stale or invented row.
    await input.fill('zzzznothing')
    await expect(page.locator('.hcmd-row')).toHaveCount(0)
    await expect(page.locator('.hcmd-empty')).toContainText('zzzznothing')

    // This used to click a quick-fill chip. The founder removed the chip row on
    // 2026-09-03 (asserted in test 1–4), but the property the click was standing
    // in for — a term the page SUGGESTS is a real query against this same index
    // — did not go with it. That property moved to the typed placeholder and is
    // asserted harder below, in "every term the placeholder types is a tool the
    // bar can actually find", which types whatever it observed on screen rather
    // than a term this file chose. What is left to check here is the recovery
    // path: a real query after a miss still resolves.
    await input.fill('gradient')
    await expect(input).toHaveValue('gradient')
    await expect(page.locator('.hcmd-row').first()).toBeVisible()

    // Enter opens the first hit.
    const first = await page.locator('.hcmd-row').first().getAttribute('href')
    await input.press('Enter')
    await page.waitForURL(`**${first}`)
  })

  test('the ⌘K keycap names a shortcut that actually works', async ({ page }) => {
    // A keycap that does nothing is a decoration that lies. This one focuses
    // the bar, which is exactly what it claims.
    await reducedMotion(page)
    watch(page, 'keyboard-first visitor')
    await go(page, '/')

    await page.locator('.hstep').first().scrollIntoViewIfNeeded()
    await page.keyboard.press('ControlOrMeta+k')
    await expect(page.locator('.hcmd-input')).toBeFocused()

    // ArrowDown walks into the results and every row is reachable by keyboard.
    await page.locator('.hcmd-input').fill('icon')
    await page.locator('.hcmd-input').press('ArrowDown')
    await expect(page.locator('.hcmd-row').first()).toBeFocused()
    await page.locator('.hcmd-row').first().press('ArrowUp')
    await expect(page.locator('.hcmd-input')).toBeFocused()

    // Escape clears rather than trapping.
    await page.locator('.hcmd-input').press('Escape')
    await expect(page.locator('.hcmd-input')).toHaveValue('')
  })

  // ── The hero bar's typed placeholder ──────────────────────────────────────
  //
  // FOUNDER, 2026-09-03: "the search box text animation i want that to play on
  // the homepage hero search bar, and make it not need to be on hover, remove
  // the try line below it remove the seacrh every tool line above it".
  //
  // The two removals are asserted in test 1–4 above. These three cover what had
  // to replace them, because deleting the chips deleted the only thing on the
  // page that told a visitor what is searchable. The animation inherits that
  // job, and a decorative animation cannot do a job — hence "the terms are
  // real" being pinned as hard as "the terms move".

  test('the hero placeholder types by itself, with nothing hovered or focused', async ({ page }) => {
    await motionOn(page)
    watch(page, PERSONA)
    await go(page, '/')

    const input = page.locator('.hcmd-input')
    await input.waitFor()

    // Not one pointer or keyboard event is sent in this test. That IS the
    // assertion: the nav's version of this animation is gated behind
    // `.pnav-search-field:hover` in global.css and would produce nothing at all
    // under these conditions — which is also every condition on a touch device.
    await expect
      .poll(async () => (await input.getAttribute('placeholder')).includes(CARET), {
        timeout: 9000,
        message: 'the hero placeholder never started typing on its own',
      })
      .toBe(true)

    const seen = await samplePlaceholder(page, 2500)
    expect(seen.length, `the placeholder is not moving: ${JSON.stringify(seen)}`).toBeGreaterThan(5)
  })

  test('every term the placeholder types is a tool the bar can actually find', async ({ page }) => {
    await motionOn(page)
    watch(page, PERSONA)
    await go(page, '/')

    const input = page.locator('.hcmd-input')
    await input.waitFor()
    await expect
      .poll(async () => (await input.getAttribute('placeholder')).includes(CARET), { timeout: 9000 })
      .toBe(true)

    // Long enough to see at least one word typed, held and erased.
    const seen = await samplePlaceholder(page, 9000)

    // Only samples carrying the caret, so the resting placeholder — which is a
    // sentence, not a query — can never be mistaken for a term.
    const words = [...new Set(
      seen.filter(v => v.includes(CARET)).map(v => v.replace(CARET, '')),
    )].filter(Boolean)

    // A FINISHED word is one that no other observed sample extends. Derived
    // from what was actually on screen rather than from the component's list,
    // so this cannot pass by agreeing with the implementation's own bug.
    const finished = words.filter(w => !words.some(other => other !== w && other.startsWith(w)))
    expect(finished.length, `no completed term was seen in ${JSON.stringify(words)}`).toBeGreaterThan(0)

    for (const term of finished) {
      await input.fill(term)
      await expect(page.locator('.hcmd-row').first(),
        `the placeholder advertises "${term}", and the bar finds nothing for it`).toBeVisible()
    }
  })

  test('reduced motion gets a still placeholder that still names real tools', async ({ page }) => {
    // No motionOn() here: the describe's own `reducedMotion: 'reduce'` plus the
    // stored preference IS the condition under test.
    await reducedMotion(page)
    watch(page, 'visitor who has asked the OS for less motion')
    await go(page, '/')

    const input = page.locator('.hcmd-input')
    await input.waitFor()

    // Three seconds. A character lands every 55ms once typing starts at 1200ms,
    // so an animation that ran at all would show dozens of distinct values.
    const seen = await samplePlaceholder(page, 3000)
    expect(seen, `the placeholder animated under reduced motion: ${JSON.stringify(seen)}`).toHaveLength(1)
    expect(seen[0], 'a reduced-motion visitor was shown a typing caret').not.toContain(CARET)

    // Still, and still doing the removed chips' job. A reduced-motion visitor
    // loses the animation; they must not also lose the information, or the
    // preference has quietly cost them the affordance rather than the effect.
    const terms = (seen[0].split('—')[1] || '')
      .split(',').map(s => s.replace(/…/g, '').trim()).filter(Boolean)
    expect(terms.length, `the resting placeholder names nothing searchable: "${seen[0]}"`).toBeGreaterThan(1)

    for (const term of terms) {
      await input.fill(term)
      await expect(page.locator('.hcmd-row').first(),
        `the resting placeholder names "${term}", and the bar finds nothing for it`).toBeVisible()
      await input.fill('')
    }
  })

  test('the pricing panel leads with the approved ladder and does not invent proof', async ({ page }) => {
    await reducedMotion(page)
    watch(page, 'visitor deciding whether to pay')
    await go(page, '/')

    // Founder-approved ladder (design-language-v2.md), headline "from $4/month".
    await expect(page.locator('.hprice-title')).toContainText('$4/month')
    const ladder = await page.locator('.hprice-row').evaluateAll(
      (rows) => rows.map((r) => r.textContent.replace(/\s+/g, ' ').trim()),
    )
    expect(ladder.length).toBe(3)
    expect(ladder[0]).toContain('$7')
    expect(ladder[1]).toContain('$18')
    expect(ladder[2]).toContain('$48')
    // The mock headlined Pro at $6/mo. The approved ladder headlines $4 — $6 is
    // legitimately the QUARTERLY per-month figure, so the check belongs on the
    // headline, not on the panel as a whole.
    await expect(page.locator('.hprice-title')).not.toContainText('$6')
    expect(ladder[1], 'quarterly is the only $6/month row').toContain('$6')

    // The community strip states real counts and never a fabricated rank.
    await expect(page.locator('.hcomm-note')).toContainText('curated starting points')
    await page.locator('.hcomm-tab', { hasText: 'Most saved' }).click()
    await expect(page.locator('.hcomm-note')).toContainText('real saves')
    // Every count is a real count, which starts at zero. A visible zero is
    // honest; an invented 342 is not. (`text-transform` uppercases these, so
    // the match is deliberately case-insensitive.)
    const saves = await page.locator('.hcomm-card-saves').allInnerTexts()
    expect(saves.every((s) => /^0 saves$/i.test(s.trim())), JSON.stringify(saves)).toBe(true)
  })

  test('typography mode previews real scale maths and hands the draft to Type Scale', async ({ page }) => {
    await reducedMotion(page)
    watch(page, 'designer beginning a typography system on the homepage')
    await page.addInitScript(() => {
      localStorage.setItem('vs-current-design', JSON.stringify({
        fonts: {
          heading: { family: 'Merriweather', weight: 700, category: 'serif' },
          body: { family: 'Lora', weight: 400, category: 'serif' },
        },
        typeScale: {
          base: 15,
          ratio: 1.2,
          lineHeight: 1.5,
          headingSpacing: 0,
          bodySpacing: 0,
        },
      }))
    })
    await go(page, '/')

    await page.locator('.hw-tab[data-tab="typography"]').click()
    await expect(page.locator('.hw-type-row')).toHaveCount(4)
    await expect(page.locator('.hw-panel').getByRole('link', { name: /Font Gallery/ })).toHaveAttribute('href', '/create/font-gallery')
    await expect(page.locator('.hw-panel').getByRole('link', { name: /Font Pair/ })).toHaveAttribute('href', '/create/font-pair')

    // Real key entry must allow the native number input to become empty while
    // replacing its value; the committed draft is validated on blur.
    const baseInput = page.getByLabel('Base size')
    await baseInput.focus()
    await page.keyboard.press('Control+A')
    await page.keyboard.press('Backspace')
    await expect(baseInput).toHaveValue('')
    await page.keyboard.type('20')
    await page.keyboard.press('Tab')
    await expect(baseInput).toHaveValue('20')
    // Scale ratio is an OPTIONS rail of toggles now, not a select. A click does
    // not imply a value the way selectOption did, so the pressed state — the
    // thing a screen reader is actually told — is asserted explicitly. The
    // contract did not cover that before.
    const ratio = page.getByRole('button', { name: 'Perfect fourth · 1.333' })
    await ratio.click()
    await expect(ratio).toHaveAttribute('aria-pressed', 'true')
    await page.getByLabel('Preview text').fill('Systems need typographic rhythm')
    await expect(page.locator('.hw-type-row').first()).toContainText('47.4px')
    await expect(page.locator('.hw-type-sample')).toHaveText([
      'Systems need typographic rhythm',
      'Systems need typographic rhythm',
      'Systems need typographic rhythm',
      'Systems need typographic rhythm',
    ])

    // Session state survives mode changes.
    await page.locator('.hw-tab[data-tab="palette"]').click()
    await page.locator('.hw-tab[data-tab="typography"]').click()
    await expect(page.getByLabel('Base size')).toHaveValue('20')

    await page.getByRole('button', { name: /Continue in Type Scale/ }).click()
    await page.waitForURL('**/create/type-scale')
    await expect(page.locator('.tsc-status')).toContainText('20px')
    await expect(page.locator('.tsc-status')).toContainText('1.333')
    // The homepage carries scale maths only: saved family choices survive.
    // Read off the picker's name line rather than a form value — the family
    // picker is a specimen trigger now, not a <select>, because a <select>
    // renders every option in the UI font and so could never show a face.
    const picker = (label) => page.locator('.typ-picker').filter({ hasText: label }).first()
    await expect(picker('Heading family').locator('.typ-picker-name')).toHaveText('Merriweather')
    await expect(picker('Body family').locator('.typ-picker-name')).toHaveText('Lora')
  })

  test('8 · palette and gradient produce real values with honest states', async ({ page }) => {
    await reducedMotion(page)
    watch(page, PERSONA)
    await page.context().grantPermissions(['clipboard-read', 'clipboard-write'])
    await go(page, '/')

    // Palette: real generated hex values, locking, and copy that reports truth.
    const hexes = page.locator('.hw-pal-hex')
    await expect(hexes).toHaveCount(5)
    const before = await hexes.allInnerTexts()
    expect(before.every((h) => /^#[0-9A-F]{6}$/.test(h))).toBe(true)

    await page.locator('.hw-pal-lock').first().click()
    await expect(page.locator('.hw-pal-lock').first()).toHaveAttribute('aria-pressed', 'true')
    await page.getByRole('button', { name: 'Generate' }).click()
    const after = await hexes.allInnerTexts()
    expect(after[0], 'a locked colour survives generate').toBe(before[0])
    expect(after.slice(1).join()).not.toBe(before.slice(1).join())

    // Copy announces success without renaming the swatch's control.
    const copyButton = page.locator('.hw-pal-copy').first()
    const name = await copyButton.getAttribute('aria-label')
    await copyButton.click()
    await expect(copyButton).toHaveAttribute('aria-label', name)
    await expect(page.locator('.hw-shell [role="status"]')).toContainText(after[0])
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(after[0])

    // Gradient: editable stops, a real CSS value, and copy.
    await page.locator('.hw-tab[data-tab="gradient"]').click()
    const startHex = page.locator('#hw-grad-from')
    await startHex.fill('#FF0000')
    await expect(page.locator('.hw-code')).toContainText('#FF0000')
    await page.locator('#hw-grad-angle').fill('90')
    await expect(page.locator('.hw-code')).toContainText('linear-gradient(90deg')

    // Invalid input keeps the last valid preview and explains the correction.
    await startHex.fill('not-a-colour')
    await expect(page.locator('.hw-field-err')).toContainText('#FF0000')
    await expect(page.locator('.hw-code')).toContainText('#FF0000')

    await page.getByRole('button', { name: 'Copy CSS' }).click()
    expect(await page.evaluate(() => navigator.clipboard.readText())).toContain('linear-gradient(90deg')
  })

  // The palette mode's artefact. It replaced a row of five labelled swatches,
  // and the two things that make it worth more than the row are the two things
  // asserted here: it is painted from the palette that is actually on screen,
  // and no part of it paints itself invisible.
  test('8a · the palette preview is a real UI painted from the live swatches', async ({ page }) => {
    await reducedMotion(page)
    watch(page, PERSONA)
    await go(page, '/')

    const stage = page.locator('.hw-stage .hw-ui')
    await expect(stage).toBeVisible()

    // Decorative and inert: the swatch buttons below carry every value for
    // real, so nothing in the mock is focusable or reachable by name.
    await expect(stage).toHaveAttribute('aria-hidden', 'true')
    await expect(stage.locator('button, a, input, [tabindex]')).toHaveCount(0)

    // A DOT MAY NEVER BE THE CARD IT SITS ON. `derivePreviewRoles` spends one
    // palette step as the card's background; in dark theme that is the darkest
    // step, which was also the first dot — so the first row rendered with no
    // dot at all and the preview implied the palette held an unusable colour,
    // when in fact the preview had taken that colour for its own ground.
    const dotsMatchCard = async () => page.evaluate(() => {
      const card = document.querySelector('.hw-stage .hw-ui')
      const bg = getComputedStyle(card).backgroundColor
      const dots = [...card.querySelectorAll('.hw-ui-dot')]
      return { count: dots.length, clashes: dots.filter((d) => getComputedStyle(d).backgroundColor === bg).length }
    })

    let seen = await dotsMatchCard()
    expect(seen.count, 'the ramp is compared on three rows').toBe(3)
    expect(seen.clashes, 'no status dot is painted in the card background').toBe(0)

    // Generate rerolls the palette; the mock must follow it, and must still not
    // paint a dot in its own ground for the NEW palette.
    const before = await page.locator('.hw-ui-chart path').first().getAttribute('fill')
    await page.getByRole('button', { name: 'Generate' }).click()
    await expect
      .poll(async () => page.locator('.hw-ui-chart path').first().getAttribute('fill'))
      .not.toBe(before)
    seen = await dotsMatchCard()
    expect(seen.clashes, 'still true after a fresh generate').toBe(0)

    // DARK THEME IS WHERE THE CLASH LIVES, and it must be entered for real.
    // Stamping data-theme on the element does not re-render React, so the mock
    // kept deriving its roles in light mode and this assertion passed against
    // the very defect it names — verified by mutation. ThemeContext seeds from
    // localStorage 'vs-t' at mount, so the choice has to be in place before the
    // page loads.
    await page.addInitScript(() => { localStorage.setItem('vs-t', 'dark') })
    await go(page, '/')
    await expect
      .poll(async () => page.evaluate(() => document.documentElement.getAttribute('data-theme')))
      .toBe('dark')

    seen = await dotsMatchCard()
    expect(seen.count, 'the mock still renders in dark theme').toBe(3)
    expect(seen.clashes, 'no dot is the card background in dark theme either').toBe(0)
  })

  // The palette is regenerated at RANDOM on every load, so a contrast bug here
  // is a dice roll rather than a constant - which is exactly how these survived.
  // Main was failing 39-accent-contrast intermittently on .hw-pal-hex for this
  // reason. Rerolling samples the generator's space instead of whichever single
  // palette happened to load.
  //
  // WIDENED 2026-09-04. This used to check only .hw-pal-hex and .hw-ui-avatar -
  // the two elements that carry their own background - and it read
  // getComputedStyle(el).backgroundColor to find the ground. That is why the
  // product card's own text was never covered: .hw-ui-crumb, .hw-ui-metric-label
  // and .hw-ui-row-state are painted on an ANCESTOR's background, so their own
  // backgroundColor is rgba(0,0,0,0), and the old parser would have scored them
  // against black and reported nonsense. Compositing the ancestor stack is what
  // makes the wider selector list measurable at all.
  //
  // Measured on main before the fix, 60 rerolls per theme, dark only:
  //   .hw-ui-app 11.67% under AA, worst 3.56:1 - the product NAME, 14px/700
  //   .hw-ui-crumb / .hw-ui-delta 5.00%, worst 3.95
  //   .hw-ui-metric-label / .hw-ui-row-state 3.33%, worst 4.29
  //   .hw-ui-metric-num / .hw-ui-row-name 1.67%, worst 4.26
  // 24 rerolls is enough to catch a 5-12% rate reliably; it is NOT enough to
  // prove the fix, which was verified separately over 200 rerolls per theme
  // (6,800 measurements, zero under 4.5, worst 4.50).
  test('8c · every label on a generated colour clears AA, whatever is generated', async ({ page }) => {
    await reducedMotion(page)
    watch(page, PERSONA)
    await go(page, '/')

    const worstOf = async () => page.evaluate(() => {
      const chan = (c) => { const v = c / 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4) }
      const lum = (c) => 0.2126 * chan(c[0]) + 0.7152 * chan(c[1]) + 0.0722 * chan(c[2])
      // Both computed colour forms. color-mix() resolves to color(srgb ...) in
      // Chromium, and a parser that only knows rgba() silently drops the ground
      // rather than failing - the exact blind spot 39-accent-contrast carried.
      const parse = (s) => {
        s = s || ''
        const cm = s.match(/color\(srgb\s+([^)]+)\)/)
        if (cm) {
          const p = cm[1].split(/[\s/]+/).filter(Boolean).map(Number)
          return { rgb: [p[0] * 255, p[1] * 255, p[2] * 255], a: p.length > 3 ? p[3] : 1 }
        }
        const m = s.match(/rgba?\(([^)]+)\)/)
        if (!m) return null
        const p = m[1].split(/[,\s/]+/).filter(Boolean).map(Number)
        return { rgb: [p[0], p[1], p[2]], a: p.length > 3 ? p[3] : 1 }
      }
      const over = (fg, bg) => fg.rgb.map((c, i) => c * fg.a + bg[i] * (1 - fg.a))
      const ratio = (a, b) => {
        const l1 = lum(a); const l2 = lum(b)
        return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05)
      }
      // The card's text sits on an ANCESTOR's fill, so the ground has to be
      // composited rather than read off the element.
      const groundOf = (el) => {
        const stack = []
        for (let n = el; n && n !== document.documentElement; n = n.parentElement) {
          const cs = getComputedStyle(n)
          if (cs.backgroundImage && cs.backgroundImage !== 'none') return null
          const c = parse(cs.backgroundColor)
          if (c && c.a > 0) stack.push(c)
        }
        const root = parse(getComputedStyle(document.documentElement).backgroundColor)
        let base = root && root.a >= 1 ? root.rgb : [255, 255, 255]
        for (let i = stack.length - 1; i >= 0; i--) base = over(stack[i], base)
        return base
      }
      const bad = []
      let measured = 0
      // Every bit of text this panel paints ON a generated colour - the two
      // elements with their own fill, and the eight inside the product card.
      //
      // .hw-ui-btn WAS MISSING FROM THIS LIST and it is the one element here
      // that paints the role engine's own pair, role.onPrimary on role.primary,
      // with no workbench-side guarantee in front of it: .hw-ui-mark and
      // .hw-ui-avatar were moved onto labelGround/readableInk, the button never
      // was. So the engine defect [preview-onprimary-unmeasured] recorded had a
      // rendered home on this very page and this test could not see it - the
      // same shape as the parser and the background-image bail, an answer never
      // attempted rather than a wrong one. 13px/650 is small text, so 4.5:1.
      // The Palette Builder's .plb-pv-cta, .plb-pvb-navcta and
      // .plb-pvb-btn--primary read the same pair through --pv-onprimary; they
      // are fixed by the same engine change and are not re-measured here.
      const SEL = '.hw-pal-hex, .hw-ui-avatar, .hw-ui-mark, .hw-ui-app, .hw-ui-crumb, '
        + '.hw-ui-metric-label, .hw-ui-metric-num, .hw-ui-delta, .hw-ui-row-name, '
        + '.hw-ui-row-state, .hw-ui-btn'
      for (const el of document.querySelectorAll(SEL)) {
        const cs = getComputedStyle(el)
        const ground = groundOf(el)
        if (!ground) continue
        const fg = parse(cs.color)
        if (!fg) continue
        const ink = fg.a < 1 ? over(fg, ground) : fg.rgb
        measured++
        const r = ratio(ink, ground)
        const hex = (c) => '#' + c.map((v) => Math.round(v).toString(16).padStart(2, '0')).join('')
        if (r < 4.5) {
          bad.push(`${el.className} ${el.textContent.trim()} ${r.toFixed(2)}:1 ${hex(ink)} on ${hex(ground)}`)
        }
      }
      return { measured, bad }
    })

    const NL = String.fromCharCode(10)
    const failures = []
    let measured = 0

    // MEASURE ONLY A SETTLED CARD. Clicking Generate schedules a React update;
    // reading getComputedStyle in the very next task can catch the DOM between
    // the old palette and the new one, and the numbers that come back are then
    // a label from one render against a ground from another. The first draft of
    // this widening reported exactly that - #8D2046 measured on #948719, two
    // colours from different palettes and 200 degrees of hue apart - which is a
    // torn read, not a contrast bug. The invariant that says the card is settled
    // is the one the component guarantees: every swatch label sits on its own
    // hex, because .hw-pal-hex takes labelGround(s.hex) and labelGround moves it
    // only where an ink demands, never more than a step or two of lightness.
    const settled = async () => expect.poll(async () => page.evaluate(() => {
      const near = (a, b) => Math.abs(a - b) <= 24
      return [...document.querySelectorAll('.hw-pal-hex')].every((el) => {
        const t = (el.textContent || '').trim()
        if (!/^#[0-9A-F]{6}$/i.test(t)) return false
        const want = [1, 3, 5].map((i) => parseInt(t.slice(i, i + 2), 16))
        const got = (getComputedStyle(el).backgroundColor.match(/\d+/g) || []).map(Number)
        return got.length >= 3 && want.every((v, i) => near(v, got[i]))
      })
    }), { message: 'the swatch labels and their grounds are from the same render' })
      .toBe(true)

    // BOTH THEMES, and that is not padding. Every failure this test was widened
    // to catch was dark-only - light measured clean at 200 rerolls. The suite
    // has no colorScheme set, so a single-theme run here is a light run, and
    // this test would have passed on main while the defect it names was live.
    //
    // THE THEME HAS TO BE SET BEFORE THE APP BOOTS, not stamped onto the html
    // element afterwards, and getting that wrong is a silent vacuous pass. The
    // card's colours are INLINE STYLES that React computes from
    // derivePreviewRoles(hexes, { mode }), and `mode` comes from useTheme() -
    // React state, which a setAttribute on documentElement does not touch. The
    // first draft of this loop did exactly that: the CSS tokens flipped, the
    // page LOOKED dark, data-theme read back 'dark', and every colour under test
    // was still computed in light mode. Verified by mutation - with the fix
    // reverted, that version passed 8c. Seeding localStorage and reloading makes
    // the APP set data-theme, so polling for it is then a real signal.
    for (const theme of ['light', 'dark']) {
      if (theme === 'dark') {
        await page.addInitScript(() => {
          try { localStorage.setItem('vs-t', 'dark') } catch { /* private mode */ }
        })
        await go(page, '/')
      }
      await expect.poll(
        () => page.evaluate(() => document.documentElement.getAttribute('data-theme')),
        { message: `the APP put itself in ${theme} - not a setAttribute from here` },
      ).toBe(theme)
      // FOUR ROUNDS, NOT TWENTY-FOUR, AND THE COVERAGE DID NOT GO ANYWHERE.
      // This loop used to run 24 times per theme - 48 rerolls, each with a settle
      // poll and a full contrast walk, all inside ONE 30s budget. It passed alone
      // and timed out under suite load, and the timeout landed on the Generate
      // click, which is exactly where the REAL unreachable-Generate defect on
      // [workbench-handoff-overlays-controls] lands too. Same file, same locator,
      // same message: a flake that impersonates a live defect.
      //
      // Reproduced on demand rather than argued about, with Chromium
      // Emulation.setCPUThrottlingRate: at 10x this test takes 40.1s at 24 rounds
      // (busting the budget on the click at what was line 1092) and 18.4s at 4.
      //
      // The exhaustive version now lives in tests/unit/home-workbench-ink.test.js,
      // which drives the same pure functions over ALL 16,200 colours the generator
      // can emit plus 2,880 card-ink pairs across both modes, in about 190ms each.
      // What stays here is the half only a browser can answer: that the COMPONENT
      // still routes its swatch labels and card text through those functions, on
      // the ground it actually composites. Dropping either half has already gone
      // wrong once in this repo - the estimate that skipped the render missed
      // role.text by assuming the ground equalled role.surface.
      for (let i = 0; i < 4; i++) {
        await settled()
        const seen = await worstOf()
        measured += seen.measured
        failures.push(...seen.bad.map((f) => `[${theme}] ${f}`))
        await page.getByRole('button', { name: 'Generate' }).click()
      }
    }
    // ANTI-VACUITY, and it is load-bearing now that the loop is four rounds
    // rather than twenty-four. worstOf() reports VIOLATIONS and says nothing
    // about how many labels it examined, so a panel that rendered nothing - or a
    // renamed class in SEL - would report a clean run rather than a failure. The
    // exhaustive sweep in tests/unit/home-workbench-ink.test.js cannot see that
    // either: it proves the maths, not that this component still calls it.
    expect(measured, 'no generated-colour label was found to measure').toBeGreaterThan(40)
    expect(failures.join(NL), 'label on a generated fill under 4.5:1').toBe('')
  })

  // The type ladder is the artefact of its mode: it must show every step it
  // claims. The sticky column caps the panel to the viewport, and the first
  // version of that cap let the stage shrink — the ladder silently lost its
  // CAPTION row and was sliced through BODY while every geometry check passed.
  test('8b · the type scale preview shows all four steps, uncropped', async ({ page }) => {
    await reducedMotion(page)
    watch(page, PERSONA)
    await go(page, '/')
    await page.locator('.hw-tab[data-tab="typography"]').click()

    const rows = page.locator('.hw-type-row')
    await expect(rows).toHaveCount(4)

    const cropped = await page.evaluate(() => {
      const box = document.querySelector('.hw-type-preview').getBoundingClientRect()
      return [...document.querySelectorAll('.hw-type-row')]
        .filter((r) => {
          const b = r.getBoundingClientRect()
          return b.bottom > box.bottom + 0.5 || b.top < box.top - 0.5
        })
        .map((r) => r.querySelector('.hw-type-meta').textContent)
    })
    expect(cropped, 'no step is cut off by the preview box').toEqual([])
  })

  test('9 · the three references and the 4K · WebP · Lossless output intent', async ({ page }) => {
    await reducedMotion(page)
    watch(page, PERSONA)
    await go(page, '/')
    await page.locator('.hw-tab[data-tab="image"]').click()

    const subtabs = page.locator('.hw-subtab')
    await expect(subtabs).toHaveCount(3)
    expect(await subtabs.allInnerTexts()).toEqual(['Architecture', 'People', 'Nature'])
    await expect(subtabs.first()).toHaveAttribute('aria-selected', 'true')

    // First entry: the approved default intent, stated as an intent.
    await expect(page.locator('.hw-intent')).toContainText('4K · WebP · Lossless')
    await expect(page.locator('.hw-intent')).toContainText('Nothing is converted here')
    // WebP cannot honour Lossless in the real converter, and says so up front.
    await expect(page.locator('.hw-limit')).toContainText('cannot store a')

    // The bundled thumbnail carries its intrinsic size, so nothing shifts.
    const active = page.locator('.hw-ref-img:not([hidden])')
    await expect(active).toHaveAttribute('width', '880')
    await expect(active).toHaveAttribute('height', '495')
    await expect(active).toHaveAttribute('alt', /.{20,}/)

    // Changing a reference does not discard edited output choices.
    // File type is an OPTIONS rail now. Scoped by the rail's own label so the
    // match cannot wander into another group.
    const png = page.locator('[aria-labelledby="hw-img-fmt-label"] .hw-tile', { hasText: 'PNG' })
    await png.click()
    await expect(png).toHaveAttribute('aria-pressed', 'true')
    await page.locator('#hw-img-res').selectOption('2k')
    await subtabs.nth(2).click()
    await expect(subtabs.nth(2)).toHaveAttribute('aria-selected', 'true')
    await expect(page.locator('.hw-intent')).toContainText('2K · PNG · Lossless')
    await expect(page.locator('.hw-limit')).toHaveCount(0)

    // Switching primary tabs preserves the session's edits.
    await page.locator('.hw-tab[data-tab="palette"]').click()
    await page.locator('.hw-tab[data-tab="image"]').click()
    await expect(page.locator('.hw-intent')).toContainText('2K · PNG · Lossless')
    await expect(subtabs.nth(2)).toHaveAttribute('aria-selected', 'true')

    // Sub-tab keyboard pattern.
    await subtabs.nth(2).press('Home')
    await expect(subtabs.first()).toBeFocused()
    await expect(subtabs.first()).toHaveAttribute('aria-selected', 'true')

    // Reset returns Architecture and the default intent.
    await page.getByRole('button', { name: 'Reset' }).click()
    await expect(subtabs.first()).toHaveAttribute('aria-selected', 'true')
    await expect(page.locator('.hw-intent')).toContainText('4K · WebP · Lossless')
  })

  test('10 · Try your image raises the picker synchronously; cancel changes nothing', async ({ page }) => {
    await reducedMotion(page)
    watch(page, PERSONA)
    await go(page, '/')
    await page.locator('.hw-tab[data-tab="image"]').click()
    await page.locator('[aria-labelledby="hw-img-fmt-label"] .hw-tile', { hasText: 'PNG' }).click()

    const button = page.getByRole('button', { name: 'Try your image' })

    // Pointer activation.
    const byClick = page.waitForEvent('filechooser', { timeout: 3000 })
    await button.click()
    const chooser = await byClick
    expect(chooser.isMultiple(), 'the converter accepts a batch').toBe(true)

    // Keyboard activation raises it from the same trusted handler.
    const byKeyboard = page.waitForEvent('filechooser', { timeout: 3000 })
    await button.focus()
    await button.press('Enter')
    await byKeyboard

    // Cancelling produces no route change, no error and no draft change.
    expect(new URL(page.url()).pathname).toBe('/')
    await expect(page.locator('.hw-tab[data-tab="image"]')).toHaveAttribute('aria-selected', 'true')
    await expect(page.locator('.hw-intent')).toContainText('4K · PNG · Lossless')
    await expect(page.locator('.hw-alert')).toHaveCount(0)
  })

  test('11–12 · the image hand-off transfers once and never resurrects', async ({ page }) => {
    await reducedMotion(page)
    watch(page, PERSONA)
    await go(page, '/')
    await page.locator('.hw-tab[data-tab="image"]').click()
    await page.locator('[aria-labelledby="hw-img-fmt-label"] .hw-tile', { hasText: 'PNG' }).click()
    await page.locator('#hw-img-res').selectOption('2k')

    await page.locator('.hw-body input[type="file"]').setInputFiles([png('one.png'), png('two.png')])

    // 11 · the converter receives both files and the draft, exactly once.
    await page.waitForURL('**/create/file-converter')
    await expect(page.locator('.fc-card')).toHaveCount(2)
    const note = page.locator('.fc-draft-note')
    await expect(note).toContainText('PNG')
    await expect(note).toContainText('1920 px')
    await expect(page.locator('select').first()).toHaveValue('image/png')

    // Nothing about the files reached the URL or web storage.
    expect(page.url()).not.toContain('one.png')
    const leaked = await page.evaluate(() => {
      const all = [
        ...Object.entries(localStorage).map(([k, v]) => `${k}=${v}`),
        ...Object.entries(sessionStorage).map(([k, v]) => `${k}=${v}`),
      ].join('|')
      return /one\.png|two\.png/.test(all)
    })
    expect(leaked, 'filenames must never reach web storage').toBe(false)

    // 12 · a second visit / remount does not import them again.
    await page.goBack()
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    await page.goForward()
    await expect(page.locator('.fc-drop')).toBeVisible()
    await expect(page.locator('.fc-card')).toHaveCount(0)
    await expect(page.locator('.fc-draft-note')).toHaveCount(0)
  })

  test('12 · a direct or reloaded File Converter opens no picker and holds no stale file', async ({ page }) => {
    watch(page, 'visitor arriving at the converter directly')
    let choosers = 0
    page.on('filechooser', () => { choosers += 1 })

    await go(page, '/create/file-converter')
    await expect(page.locator('.fc-drop')).toBeVisible()
    await expect(page.locator('.fc-card')).toHaveCount(0)
    await page.reload({ waitUntil: 'domcontentloaded' })
    await expect(page.locator('.fc-drop')).toBeVisible()
    await expect(page.locator('.fc-card')).toHaveCount(0)
    expect(choosers, 'no picker may open on mount').toBe(0)

    // A fresh activation still opens it.
    const opened = page.waitForEvent('filechooser', { timeout: 3000 })
    await page.locator('.fc-drop').click()
    await opened
    expect(choosers).toBe(1)
  })

  test('13 · an unsupported selection stays home with a recovery path', async ({ page }) => {
    await reducedMotion(page)
    watch(page, PERSONA)
    await go(page, '/')
    await page.locator('.hw-tab[data-tab="image"]').click()

    await page.locator('.hw-body input[type="file"]').setInputFiles({
      name: 'brief.pdf', mimeType: 'application/pdf', buffer: Buffer.from('not an image'),
    })

    expect(new URL(page.url()).pathname).toBe('/')
    const alert = page.getByRole('alert')
    await expect(alert).toContainText('not images')
    await expect(alert.getByRole('button', { name: 'Choose images again' })).toBeVisible()
    // The draft survived the rejection.
    await expect(page.locator('.hw-intent')).toContainText('4K · WebP · Lossless')

    // One accepted selection produces exactly one transfer.
    await page.locator('.hw-body input[type="file"]').setInputFiles([png('ok.png')])
    await page.waitForURL('**/create/file-converter')
    await expect(page.locator('.fc-card')).toHaveCount(1)
  })

  test('14–15 · the icon preview is local-only and opens the real editor', async ({ page }) => {
    await reducedMotion(page)
    watch(page, PERSONA)
    await go(page, '/')
    await page.locator('.hw-tab[data-tab="icon"]').click()

    const snapshot = () => page.evaluate(() => JSON.stringify(Object.entries(localStorage).sort()))
    const before = await snapshot()

    // 14 · controls mutate the preview and nothing else.
    await page.getByRole('button', { name: /Preview the zap icon/ }).click()
    // Size and stroke are OPTIONS rails now. Each is scoped by its own rail's
    // label so "32" cannot match a tile in the other rail, and the stroke
    // filter is anchored so /^2$/ does not also select 2.5.
    const size32 = page.locator('[aria-labelledby="hw-icon-size-label"] .hw-tile', { hasText: '32' })
    const stroke2 = page.locator('[aria-labelledby="hw-icon-stroke-label"] .hw-tile').filter({ hasText: /^2$/ })
    await size32.click()
    await stroke2.click()
    await expect(size32).toHaveAttribute('aria-pressed', 'true')
    await expect(stroke2).toHaveAttribute('aria-pressed', 'true')
    await expect(page.locator('.hw-icon-meta')).toContainText('zap · 32px · 2 stroke')
    await expect(page.locator('.hw-icon-preview svg')).toHaveAttribute('width', '32')
    expect(await snapshot(), 'no storage, recents or quota write').toBe(before)

    // 15 · a valid draft opens the real editor with the supported values.
    await page.getByRole('button', { name: /Continue in Icon Editor/ }).click()
    await page.waitForURL('**/create/icons')
    const customiser = page.locator('.icust, .ig-custom, [class*="icust"]').first()
    await expect(customiser).toBeVisible({ timeout: 10000 })
    await expect(page.getByText('zap', { exact: false }).first()).toBeVisible()

    // A reloaded editor route falls back to the normal state — the ephemeral
    // draft is gone and grants nothing.
    await page.reload({ waitUntil: 'domcontentloaded' })
    await expect(page.locator('.ic').first()).toBeVisible({ timeout: 15000 })
    await expect(page.locator('.icust').first()).toHaveCount(0)
  })

  test('15 · a direct Icon Library visit never inherits a draft', async ({ page }) => {
    watch(page, 'visitor arriving at the editor directly')
    await go(page, '/create/icons')
    await expect(page.locator('.ic').first()).toBeVisible({ timeout: 15000 })
    await expect(page.locator('.icust')).toHaveCount(0)
  })

  test('11a · a hand-off lands looking at the uploaded images, not the drop zone', async ({ page }) => {
    // Motion ON: this is the smooth-scroll path (Lenis owns the position), which
    // the reduced-motion tests below cannot exercise.
    await page.emulateMedia({ reducedMotion: 'no-preference' })
    await page.addInitScript(() => {
      localStorage.setItem('vs-appearance', JSON.stringify({
        rounding: 'default', density: 'cozy', reducedMotion: false,
      }))
    })
    watch(page, PERSONA)
    await go(page, '/')
    await handOffImages(page, [png('one.png'), png('two.png')])
    await expect(page.locator('.fc-card')).toHaveCount(2)

    // The viewport actually moved off the top, and settled. "Settled" used to
    // mean two equal readings of scrollY in a row, which is not the same claim:
    // window.scrollY is a whole-pixel view of a value Lenis is still damping, so
    // two equal readings are routinely available part-way through an ease. Every
    // geometry assertion below is then measured against a page that is still
    // moving. restingScrollY() waits for the scroll layer itself to say it has
    // finished — see helpers.js.
    //
    // The wait for the movement to BEGIN used to be a 10s poll on scrollY, which
    // is the same clock-versus-take-up guess that failed 28-account-menu-
    // keyboard.spec.js from the other direction: a hand-off slower to take up
    // than the deadline would be reported as a hand-off that never scrolled.
    // restAfterMove waits for take-up in animation frames and then for rest, so
    // the number below is the landing position and nothing else.
    const landed = await restAfterMove(page, 0, 'the converter after the hand-off scrolled to it')
    expect(landed, 'the hand-off never moved the viewport off the top').toBeGreaterThan(0)
    const view = await converterView(page)

    // The heading of the region is clear of the fixed bar, not under it.
    expect(view.queue.top, 'queue hidden beneath the sticky nav').toBeGreaterThanOrEqual(view.navBottom - 1)
    // And the first uploaded image is fully on screen.
    expect(view.card.top).toBeGreaterThanOrEqual(view.navBottom - 1)
    expect(view.card.bottom).toBeLessThanOrEqual(view.viewport)

    // Assistive tech is told where the viewport went: focus is on the named region.
    expect(view.focusedQueue, 'focus did not move to the queue region').toBe(true)
    expect(view.focusLabel).toContain('2 images')

    // The drop zone is still there, above, and still reachable for more files.
    expect(view.drop.height).toBeGreaterThan(0)
    await page.locator('.fc-drop').scrollIntoViewIfNeeded()
    const back = await converterView(page)
    expect(back.drop.bottom).toBeGreaterThan(back.navBottom)
    expect(back.drop.top).toBeLessThanOrEqual(back.viewport)
  })

  test('11b · reduced motion jumps instantly, and never smooth-scrolls', async ({ page }) => {
    await reducedMotion(page)
    await spyOnScrollTo(page)
    watch(page, 'visitor who asked the OS to reduce motion')
    await go(page, '/')
    await handOffImages(page, [png('one.png')])
    await expect(page.locator('.fc-card')).toHaveCount(1)

    // Take-up, then rest — not a 5s poll for "has it moved yet". Reduced motion
    // never instantiates Lenis so this jump is instant, but the deadline was
    // still the only thing separating "slow" from "never happened".
    const landed = await restAfterMove(page, 0, 'the converter after the reduced-motion jump')
    expect(landed, 'the hand-off never moved the viewport off the top').toBeGreaterThan(0)
    const calls = await scrollCalls(page)
    // Reduced motion never instantiates Lenis, so the reveal goes through
    // window.scrollTo — and must ask for an instant jump.
    expect(calls.every((c) => c.behavior !== 'smooth'), JSON.stringify(calls)).toBe(true)
    const reveal = calls.filter((c) => c.top > 0)
    expect(reveal.length, 'exactly one reveal scroll').toBe(1)
    expect(reveal[0].behavior).toBe('auto')

    const view = await converterView(page)
    expect(view.queue.top).toBeGreaterThanOrEqual(view.navBottom - 1)
    expect(view.card.bottom).toBeLessThanOrEqual(view.viewport)
  })

  test('11c · a direct visit and a manual upload never move the viewport', async ({ page }) => {
    await reducedMotion(page)
    await spyOnScrollTo(page)
    watch(page, 'visitor arriving at the converter directly')

    await go(page, '/create/file-converter')
    await expect(page.locator('.fc-drop')).toBeVisible()
    expect((await converterView(page)).scrollY, 'a direct visit auto-scrolled').toBe(0)

    // Uploading by hand is the visitor's own action, at the drop zone they are
    // already looking at — it must not yank the page anywhere.
    await page.locator('.fc-drop input[type="file"]').setInputFiles([png('one.png'), png('two.png')])
    await expect(page.locator('.fc-card')).toHaveCount(2)
    // Longer than the reveal's own frame budget, so a late scroll would be caught.
    await page.waitForTimeout(800)
    expect((await converterView(page)).scrollY, 'a manual upload scrolled').toBe(0)
    expect((await scrollCalls(page)).filter((c) => c.top > 0), 'a manual upload scrolled').toEqual([])
  })

  // OBJECT, THEN DECISION, THEN ACTION - and 11c above is why this needs its
  // own test: the page deliberately does NOT scroll on upload, so whatever
  // the visitor can see at rest is the whole of the feedback they get.
  // Measured at 390x844 before the fix: dropzone 381, Output Settings 576,
  // "Convert 1 image" 839, and the file row 915 - past the fold and 76px
  // BELOW the button that acts on it, on a screen still reading "Drop images
  // here or click to browse". Gamma, Fireflies, Adobe Express, Whop, Magnific
  // and Sana AI all confirm the object first; this confirmed it last.
  test('11d · the file you just added is above the button that converts it', async ({ page }) => {
    await reducedMotion(page)
    watch(page, 'someone converting one image on their phone')
    await page.setViewportSize({ width: 390, height: 844 })

    await go(page, '/create/file-converter')
    await expect(page.locator('.fc-drop')).toBeVisible()
    await page.locator('.fc-drop input[type="file"]').setInputFiles([png('holiday.png')])
    await expect(page.locator('.fc-card')).toHaveCount(1)

    const order = await page.evaluate(() => {
      const docTop = (el) => Math.round(el.getBoundingClientRect().top + window.scrollY)
      const settings = [...document.querySelectorAll('.sl')]
        .find((n) => /Output Settings/i.test(n.textContent))
      const convert = [...document.querySelectorAll('button')]
        .find((b) => /^Convert \d/.test(b.textContent.trim()))
      const card = document.querySelector('.fc-card')
      return {
        dropzone: docTop(document.querySelector('.fc-drop')),
        card: docTop(card),
        settings: settings ? docTop(settings) : null,
        convert: convert ? docTop(convert) : null,
        name: card.querySelector('.fc-name').textContent.trim(),
        // At rest, unscrolled: is the confirmation on the screen the visitor
        // is already looking at?
        topInView: card.getBoundingClientRect().top < window.innerHeight,
        scrollY: Math.round(window.scrollY),
      }
    })

    expect(order.name, 'the row should name the file that was added').toBe('holiday.png')
    expect(order.settings, 'Output Settings should be on the page').not.toBeNull()
    expect(order.convert, 'the Convert button should be on the page').not.toBeNull()
    expect(order.scrollY, 'adding a file must not move the page').toBe(0)
    expect(order.card, 'the file lands under the dropzone that accepted it')
      .toBeGreaterThan(order.dropzone)
    expect(order.card, 'the object must come before the decision').toBeLessThan(order.settings)
    expect(order.card, 'the object must come before the action that acts on it')
      .toBeLessThan(order.convert)
    expect(order.topInView, 'the only confirmation of the upload sits below the fold at 390x844')
      .toBe(true)
  })

  test('16 · offline: no catalogue or remote image calls, and every panel still works', async ({ page }) => {
    await reducedMotion(page)
    watch(page, 'designer working on a train')

    const remote = []
    page.on('request', (request) => {
      const url = request.url()
      const hostname = url.startsWith('http') ? new URL(url).hostname : ''
      if (hostname !== 'localhost' && hostname !== '127.0.0.1' && !url.startsWith('data:') && !url.startsWith('blob:')) {
        remote.push(url)
      }
    })

    await go(page, '/')
    // Visit every panel and every reference while online-ish.
    for (const id of ['gradient', 'image', 'icon', 'typography']) {
      await page.locator(`.hw-tab[data-tab="${id}"]`).click()
    }
    await page.locator('.hw-tab[data-tab="image"]').click()
    for (const index of [1, 2, 0]) await page.locator('.hw-subtab').nth(index).click()

    expect(remote.filter((u) => /iconify|logo\.dev|logodev/i.test(u)),
      'the homepage never calls an icon or logo catalogue').toEqual([])
    expect(remote.filter((u) => /\.(png|jpe?g|webp|avif|gif)(\?|$)/i.test(u)),
      'reference images are bundled, never fetched from a CDN').toEqual([])

    // Now genuinely offline: the local panels keep working.
    await page.context().setOffline(true)
    await page.locator('.hw-tab[data-tab="palette"]').click()
    await page.getByRole('button', { name: 'Generate' }).click()
    await expect(page.locator('.hw-pal-hex').first()).toHaveText(/^#[0-9A-F]{6}$/)

    await page.locator('.hw-tab[data-tab="gradient"]').click()
    await page.locator('#hw-grad-angle').fill('45')
    await expect(page.locator('.hw-code')).toContainText('linear-gradient(45deg')

    await page.locator('.hw-tab[data-tab="icon"]').click()
    await page.getByRole('button', { name: /Preview the star icon/ }).click()
    await expect(page.locator('.hw-icon-meta')).toContainText('star')

    await page.locator('.hw-tab[data-tab="image"]').click()
    await expect(page.locator('.hw-intent')).toBeVisible()

    await page.locator('.hw-tab[data-tab="typography"]').click()
    await page.getByLabel('Base size').fill('18')
    await expect(page.locator('.hw-type-row').first()).toContainText('35.2px')
    await page.context().setOffline(false)
  })
})
