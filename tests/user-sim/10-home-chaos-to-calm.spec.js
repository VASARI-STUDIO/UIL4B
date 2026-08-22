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
import { test, expect } from '@playwright/test'
import { watch, go } from './helpers.js'

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

    // 1 · the design project's headline, and the mark that ties it to the bar.
    //
    // This replaces "No more tab hoarding. / Build your UI system in one place."
    // The V2 design makes the headline and the command bar ONE idea: the
    // highlighted phrase names the input directly beneath it. The old copy
    // never mentioned searching, so the bar arrived unintroduced and the --hi
    // mark pointed at nothing. Founder instruction, 2026-08-16.
    const heading = page.getByRole('heading', { level: 1 })
    await expect(heading).toContainText('Every design tool,')
    await expect(heading).toContainText('one search box away.')

    // The mark is on "search box" specifically — that is the whole point of the
    // pairing, and a mark on any other phrase is the bug this guards.
    const mark = heading.locator('.home-mark')
    await expect(mark).toHaveCount(1)
    await expect(mark).toHaveText('search box')

    // …and the thing it names is really there, directly below it.
    const geometry = await page.evaluate(() => {
      const m = document.querySelector('.home-hero-h1 .home-mark').getBoundingClientRect()
      const bar = document.querySelector('.hcmd-bar').getBoundingClientRect()
      return { markBottom: m.bottom, barTop: bar.top }
    })
    expect(geometry.barTop, 'the command bar must sit below its own headline mark')
      .toBeGreaterThan(geometry.markBottom)

    // The sub-copy sets up typing a query rather than describing a workspace.
    await expect(page.locator('.home-hero-sub')).toContainText('Type what you need')

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

    // A quick-fill chip is a real query against the same index.
    await page.locator('.hcmd-chip', { hasText: 'gradient' }).click()
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

    // The gallery still refuses to invent proof.
    //
    // CHANGED WITH THE DATA, NOT DELETED. This block used to click a
    // "Most saved" tab and assert every card read "0 saves". Both of those
    // belonged to COMMUNITY_DESIGNS, which the section no longer renders: the
    // grid is now the shipped palette/gradient galleries, and those carry no
    // save, trending or recency signal at all. So the ordering tabs became KIND
    // filters — which sort on a property the data really has — and the cards
    // show the artefact's own facts instead of a count.
    //
    // The assertion that mattered is intact and is now stronger: it used to
    // check that one metric was honest about being zero; it now checks that no
    // fabricated metric appears anywhere in the grid.
    await expect(page.locator('.hcomm-note')).toContainText('curated starting points')
    const facts = await page.locator('.hcomm-fact').allInnerTexts()
    expect(facts.length, 'the cards state their own facts').toBeGreaterThan(0)
    expect(
      facts.filter((f) => /save|like|remix|view|download/i.test(f)),
      JSON.stringify(facts.slice(0, 12)),
    ).toEqual([])
  })

  // C8 / C9 / C10. The three things the founder read as AI-written, and the
  // shape of what replaced them.
  test('the rejected headlines are gone and the step rail names real routes', async ({ page }) => {
    await reducedMotion(page)
    watch(page, 'founder re-reading the page')
    await go(page, '/')

    const body = await page.locator('main').innerText()
    // C8: "this just sounds stupid". C10: "makes me feel like skipping over it".
    // C11: "'Systems worth stealing.' is bad copy."
    for (const rejected of ['Not a screenshot', 'Six categories. One account.', 'Systems worth stealing']) {
      expect(body, `"${rejected}" was rejected and must not come back`).not.toContain(rejected)
    }
    await expect(page.locator('#hsteps-title')).toHaveText('Use the tools here, then take the values with you.')
    await expect(page.locator('#htools-title')).toHaveText('A value you set in one tool is set in all of them.')

    // C9: `02 / GRADIENT` is gone. No NN / WORD ordinal survives anywhere.
    expect(body, body.slice(0, 400)).not.toMatch(/\b0[1-5]\s*\/\s*[A-Z]{3,}/)

    // What replaced it: the tool's real route, and a rail that still announces
    // position natively because it is an <ol>. The route line is decorative to
    // assistive tech — "slash colour slash palette" is noise, and the CTA below
    // already names the destination.
    const routes = await page.locator('.hstep-route').evaluateAll(
      (els) => els.map((el) => ({ text: el.textContent.trim(), hidden: el.getAttribute('aria-hidden') })),
    )
    expect(routes).toHaveLength(5)
    for (const route of routes) {
      expect(route.text, JSON.stringify(route)).toMatch(/^\//)
      expect(route.hidden).toBe('true')
    }
    // Each route line matches the CTA beside it, because both read one source.
    const ctas = await page.locator('.hstep-cta').evaluateAll((els) => els.map((a) => a.getAttribute('href')))
    expect(ctas).toEqual(routes.map((r) => r.text))
    expect(await page.locator('.hsteps-rail').evaluate((el) => el.tagName)).toBe('OL')
  })

  // C11. The consequential one: a section headed [ DISCOVER ] must send people
  // INTO the product. It used to render twelve outbound links to Dribbble,
  // Awwwards, Behance and Mobbin in a block labelled [ COMMUNITY ].
  test('the gallery links inward, and every card action is reachable without a pointer', async ({ page }) => {
    await reducedMotion(page)
    watch(page, 'visitor looking for somewhere to start')
    await go(page, '/')

    await expect(page.locator('.hcomm .hbrow')).toHaveText('[ DISCOVER ]')

    // Not one anchor in this section may leave the site or open a new tab.
    const links = await page.locator('.hcomm a').evaluateAll(
      (els) => els.map((a) => ({ href: a.getAttribute('href'), target: a.getAttribute('target'), rel: a.getAttribute('rel') })),
    )
    expect(links.length, 'the section links somewhere').toBeGreaterThan(6)
    for (const link of links) {
      expect(link.href, JSON.stringify(link)).toMatch(/^\//)
      expect(link.target, JSON.stringify(link)).toBeNull()
      expect(link.rel || '', JSON.stringify(link)).not.toContain('nofollow')
    }

    // The primary action carries the values with it, so the tool opens on the
    // artefact rather than on a blank board.
    //
    // The prefix moved from /color/* to /create/* when the Create tools were
    // flattened onto /create/<pagetitle>. The behaviour being asserted has not
    // changed at all — this is still "the hand-off names a real tool and carries
    // the values in the query" — only the prefix the two builders (`paletteBuilderUrl`,
    // `gradientToolUrl`) now emit. Both query shapes are unchanged.
    const first = page.locator('.hcomm-card').first()
    await expect(first.locator('.hcomm-act-open')).toHaveAttribute('href', /^\/create\/(palette\?c=|gradient\?gs=)/)

    // Both actions are REAL controls in the DOM at all times — the reveal is
    // visual only. A hover-only affordance would put the section's primary
    // action out of reach of the keyboard, which is the failure this guards.
    //
    // `toBeVisible()` cannot express this: Playwright treats an opacity-0
    // element as visible, and an element hidden with `visibility` cannot be
    // focused at all — which is the trap this section fell into on the first
    // pass. Assert the two things that actually matter: focus lands, and the
    // layer is genuinely opaque once it has.
    await first.locator('.hcomm-act-open').focus()
    await expect(first.locator('.hcomm-act-open')).toBeFocused()
    // Polled, not read once: the reveal is a transition, and a single
    // getComputedStyle immediately after focus can read the start value before
    // the transition clock has advanced a frame.
    await expect.poll(
      () => first.locator('.hcomm-acts').evaluate((el) => Number(getComputedStyle(el).opacity)),
      { message: 'focusing a card action must reveal the layer it lives in' },
    ).toBe(1)
    await first.locator('.hcomm-act-open').press('Tab')
    await expect(first.locator('.hcomm-act-copy')).toBeFocused()

    // Show more expands in place rather than navigating away.
    const before = await page.locator('.hcomm-card').count()
    await page.locator('.hcomm-more button').click()
    await expect.poll(() => page.locator('.hcomm-card').count()).toBeGreaterThan(before)
    expect(new URL(page.url()).pathname).toBe('/')
  })

  // C11, the touch half. A reveal driven by :hover is invisible forever on a
  // device that has no hover, so the gallery's primary action would be
  // unreachable for every phone visitor while looking perfectly correct in the
  // stylesheet. A narrow desktop window does NOT reproduce this — Chromium
  // still reports `hover: hover` at 390px — so this needs real mobile
  // emulation, which is why it is its own context rather than a resize.
  test('on a device with no hover, the card actions are visible without interaction', async ({ browser }) => {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      isMobile: true,
      hasTouch: true,
      reducedMotion: 'reduce',
    })
    const page = await context.newPage()
    try {
      await go(page, '/')
      expect(
        await page.evaluate(() => window.matchMedia('(hover: none)').matches),
        'the emulation must actually report a hoverless device',
      ).toBe(true)

      const acts = page.locator('.hcomm-card').first().locator('.hcomm-acts')
      expect(await acts.evaluate((el) => Number(getComputedStyle(el).opacity))).toBe(1)
      // …and they sit BELOW the artefact rather than covering it, so the card
      // still shows the thing it is offering.
      const art = await page.locator('.hcomm-card').first().locator('.hcomm-art').boundingBox()
      const box = await acts.boundingBox()
      expect(box.y, 'the actions must not cover the artefact on touch').toBeGreaterThanOrEqual(art.y + art.height - 1)
      expect(box.height, 'the actions are a real target').toBeGreaterThanOrEqual(40)
    } finally {
      await context.close()
    }
  })

  // C12 + C13. The two new sections, each guarding the specific claim it could
  // most easily get wrong: the export panel must not resize the page when the
  // format changes, and Learn must not link to a guide that does not exist.
  test('export switches format without resizing, and Learn links only where something exists', async ({ page }) => {
    await reducedMotion(page)
    watch(page, 'developer checking what actually comes out')
    await go(page, '/')

    const tabs = page.locator('.hexp-tab')
    await expect(tabs).toHaveCount(3)
    await expect(tabs.first()).toHaveAttribute('aria-selected', 'true')

    const panelHeight = async () => (await page.locator('.hexp-panel').boundingBox()).height
    const heights = { 'design.css': await panelHeight() }

    // The ARIA tabs pattern, same contract as the workbench tablist above.
    await tabs.first().focus()
    expect(await page.locator('.hexp-tab[tabindex="0"]').count()).toBe(1)
    await tabs.first().press('ArrowRight')
    await expect(tabs.nth(1)).toBeFocused()
    await expect(tabs.nth(1)).toHaveAttribute('aria-selected', 'true')
    await expect(page.locator('.hexp-file')).toHaveText('tailwind.config.js')
    heights['tailwind.config.js'] = await panelHeight()

    await tabs.nth(1).press('End')
    await expect(page.locator('.hexp-file')).toHaveText('style-guide.html')
    heights['style-guide.html'] = await panelHeight()

    // All three, measured. Three files of very different length must not
    // resize the section — that is the CLS guarantee the fixed panel height
    // exists for, and dropping it (height → auto) fails here by ~450px.
    //
    // Worth knowing if you are mutation-testing this: swapping `height` for
    // `max-height` does NOT fail, and that is correct rather than a gap. All
    // three outputs are longer than the clamp ceiling at every tested
    // viewport, so the two rules produce identical geometry — there is no
    // behaviour to catch.
    expect(new Set(Object.values(heights)).size, JSON.stringify(heights)).toBe(1)

    // The panel shows the exporter's real output, so the first line is the
    // exporter's, not a marketing sample.
    await tabs.first().click()
    await expect(page.locator('.hexp-line').first()).toHaveText(':root {')

    // Exports are free with a credit — never Pro-only (founder, 2026-08-20).
    await expect(page.locator('.hexp-plan')).toContainText('free to export')

    // Learn: four rows, exactly one of which is navigable, and it is /help.
    await expect(page.locator('.hlearn-row')).toHaveCount(4)
    const learnLinks = page.locator('.hlearn-list a')
    await expect(learnLinks).toHaveCount(1)
    await expect(learnLinks).toHaveAttribute('href', '/help')
    await expect(page.locator('.hlearn-row .htool-soon')).toHaveCount(3)
    // No read time may be invented for a guide nobody has written.
    const learnText = await page.locator('.hlearn-list').innerText()
    expect(learnText, learnText).not.toMatch(/\d+\s*min/i)
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
    await page.getByLabel('Scale ratio').selectOption('1.333')
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
    await expect(page.getByLabel('Heading family', { exact: true })).toHaveValue('Merriweather')
    await expect(page.getByLabel('Body family', { exact: true })).toHaveValue('Lora')
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
    await page.locator('#hw-img-fmt').selectOption('image/png')
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
    await page.locator('#hw-img-fmt').selectOption('image/png')

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
    await page.locator('#hw-img-fmt').selectOption('image/png')
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
    await page.locator('#hw-icon-size').selectOption('32')
    await page.locator('#hw-icon-stroke').selectOption('2')
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

    // The viewport actually moved off the top, and settled.
    await expect.poll(
      async () => (await converterView(page)).scrollY,
      { timeout: 10000 },
    ).toBeGreaterThan(0)
    let view = await converterView(page)
    await expect.poll(async () => {
      const next = await converterView(page)
      const settled = next.scrollY === view.scrollY
      view = next
      return settled
    }, { timeout: 10000 }).toBe(true)

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

    await expect.poll(async () => (await converterView(page)).scrollY, { timeout: 5000 }).toBeGreaterThan(0)
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
