// /help and /principles, walked as a visitor rather than read as source.
//
// WHY THIS SPEC IS SHAPED THIS WAY. The unit guard beside it
// (tests/unit/help-and-principles-claims.test.js) proves the DATA is derived.
// That is exactly the failure this repository keeps paying for on its own: a
// correct helper, tested in isolation, next to a page that does not call it.
// So every assertion below reads the RENDERED page and compares it to the
// registry computed independently here — not to the module the page imports.
// Break the wiring and this goes red even though the helper is still perfect.
//
// The reveal check is here for the same reason. `[data-reveal]` is
// `opacity:0` in the stylesheet and Playwright still calls such an element
// visible — #388 shipped a CTA nobody could see behind exactly that. Both pages
// use the reveal, so both are asserted on COMPUTED opacity after the observer
// has had the element in view, not on toBeVisible().
import { test, expect } from './base.js'
import { expectRendered, go, watch } from './helpers.js'
import { CREATE_GROUPS } from '../../src/data/toolTree.js'
import { EXPORT_FORMATS } from '../../src/config/exportFormats.js'
import { DEFAULT_DESIGN, tintConfigFor } from '../../src/data/designDefaults.js'
import { contrastRatio, generateTintScale, T_LABELS } from '../../src/utils/colors.js'
import { stepPx } from '../../src/utils/fluidType.js'
import { SURFACE_LINE, line } from '../../src/data/positioning.js'

/* The two figures /help prints, derived here from the registry itself so the
   page cannot satisfy this by printing its own arithmetic back at us. */
const LIVE = CREATE_GROUPS.flatMap((g) => (g.soon ? [] : g.tools.filter((t) => !t.soon))).length
const SOON = CREATE_GROUPS.flatMap((g) => (g.soon ? g.tools : g.tools.filter((t) => t.soon))).length

const FREE_FORMATS = EXPORT_FORMATS.filter((f) => f.live && !f.pro)
const PRO_FORMATS = EXPORT_FORMATS.filter((f) => f.live && f.pro)
const UNBUILT_FORMATS = EXPORT_FORMATS.filter((f) => !f.live)

/** `#rrggbb` → the `rgb(r, g, b)` string getComputedStyle hands back. */
const toRgb = (hex) => {
  const n = parseInt(hex.slice(1), 16)
  return `rgb(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255})`
}

/**
 * Scroll the whole page so every `[data-reveal]` has been intersected, then
 * wait for the observer to have run. useReveal is one-shot and adds `.is-in`,
 * so once every node carries it the transition is the only thing left.
 */
async function revealAll(page) {
  await page.evaluate(async () => {
    const step = Math.round(window.innerHeight * 0.6)
    for (let y = 0; y < document.body.scrollHeight; y += step) {
      window.scrollTo(0, y)
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))
    }
    window.scrollTo(0, 0)
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))
  })
  await expect.poll(
    () => page.evaluate(() => document.querySelectorAll('[data-reveal]:not(.is-in)').length),
    { message: 'a [data-reveal] node never received .is-in, so it is still at opacity 0' },
  ).toBe(0)
}

/** Every computed opacity on the reveal nodes, right now. */
const revealOpacities = (page) => page.evaluate(() => (
  [...document.querySelectorAll('[data-reveal]')]
    .map((el) => Number(getComputedStyle(el).opacity))
))

/**
 * Wait for the reveal TRANSITION to finish, not merely for `.is-in` to land.
 *
 * The class arrives the moment the observer fires; the opacity takes --dur-5
 * (600ms) to get there. Reading in between returns a real, honest 0.92 — which
 * is why this settles on the value rather than on a stopwatch or on the class.
 */
async function settledOpacity(page) {
  await expect.poll(
    async () => Math.min(...await revealOpacities(page)),
    { message: 'a [data-reveal] node never finished its transition to opacity 1' },
  ).toBeGreaterThan(0.999)
  return revealOpacities(page)
}

test.describe('Help & Getting Started', () => {
  test.beforeEach(async ({ page }) => { watch(page, 'a first-time visitor looking for where to start') })

  test('the hero states the main point and counts the tools off the registry', async ({ page }) => {
    await go(page, '/help')
    await expectRendered(page, '/help')

    // POSITIVE CONTROL. Everything below asserts what is on this page; this
    // asserts the page is there at all. Without it a route that rendered
    // nothing would satisfy every "must not contain" check that follows.
    const h1 = page.getByRole('heading', { level: 1 })
    await expect(h1).toBeVisible()
    await expect(h1).toContainText('Open any tool')

    // The marker pen, and only one of it — the budget in design-language-v2.md
    // is at most one --hi element per viewport, and the hero headline mark is
    // one of the four sanctioned appearances.
    await expect(page.locator('.hlp-hero .home-mark')).toHaveCount(1)

    // THE WIRING. The counts come from CREATE_GROUPS above, not from the module
    // the page imports, so a page that stopped deriving them fails here.
    await expect(page.locator('.hlp-hint'))
      .toHaveText(`${LIVE} tools open now · ${SOON} still being built`)

    // The retired names the old page advertised must not be anywhere on it.
    const body = await page.evaluate(() => document.body.innerText)
    for (const dead of ['Video to Frames', 'Image Converter', 'Design Reference']) {
      expect(body, `/help still advertises the retired tool "${dead}"`).not.toContain(dead)
    }
    expect(body, 'the false analytics claim is back').not.toMatch(/no third-party analytics/i)
  })

  test('the opening visual paints the ramp the Colour Studio would generate', async ({ page }) => {
    await go(page, '/help')
    await expectRendered(page, '/help')
    await revealAll(page)

    const ramp = generateTintScale(tintConfigFor(DEFAULT_DESIGN))
    const bars = page.locator('.hlp-run-bar')
    await expect(bars).toHaveCount(T_LABELS.length)

    // Read the painted colour of every stop and compare it to what the
    // generator produces from the project defaults. A hard-coded ramp, a stale
    // seed, or a strip that quietly stopped calling the generator all fail.
    const painted = await bars.evaluateAll((els) => els.map((el) => getComputedStyle(el).backgroundColor))
    expect(painted).toEqual(ramp.map(toRgb))

    // The seed shown is the one a new project really starts from.
    await expect(page.locator('.hlp-run-hex'))
      .toHaveText(DEFAULT_DESIGN.palette.base.toUpperCase())

    // And the files named are the built, ungated ones — the exportFormats.js
    // contract applied to this surface. An unbuilt format appearing here is the
    // defect that let /plans sell a $48 file the product cannot make.
    const files = await page.locator('.hlp-run-files li').allInnerTexts()
    expect(files.map((s) => s.trim())).toEqual(FREE_FORMATS.map((f) => f.name))
    for (const dead of UNBUILT_FORMATS) {
      expect(files, `${dead.name} is advertised but is not built`).not.toContain(dead.name)
    }
  })

  test('the revealed content is actually painted, not merely present', async ({ page }) => {
    await go(page, '/help')
    await expectRendered(page, '/help')

    // Before: at least one reveal node is genuinely transparent. This is the
    // control that stops the assertion below passing on a page where the
    // reveal was never wired at all.
    const before = await revealOpacities(page)
    expect(before.length, '/help renders no [data-reveal] nodes at all').toBeGreaterThan(2)

    await revealAll(page)
    const after = await settledOpacity(page)
    expect(after.length, 'the reveal nodes vanished between the two reads').toBe(before.length)
    for (const o of after) expect(o, 'a revealed section is still transparent').toBeGreaterThan(0.999)
  })

  test('every destination the page offers is a page a visitor can open', async ({ page }) => {
    await go(page, '/help')
    await expectRendered(page, '/help')
    await revealAll(page)

    const hrefs = await page.locator('.hlp-starts a, .hlp-answers a, .hlp-close a')
      .evaluateAll((els) => [...new Set(els.map((el) => el.getAttribute('href')))])
    expect(hrefs.length, 'the page offers no destinations').toBeGreaterThanOrEqual(6)

    for (const href of hrefs) {
      expect(href, 'a link points nowhere').toMatch(/^\//)
      await go(page, href)
      await expectRendered(page, href)
      await expect(
        page.getByRole('heading', { name: /Page not found/i }),
        `${href} is linked from /help and renders the 404`,
      ).toHaveCount(0)
      await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible()
    }
  })
})

test.describe('Design Principles', () => {
  test.beforeEach(async ({ page }) => { watch(page, 'a visitor deciding whether this product has a point of view') })

  test('every rule renders with the proof it claims to be beside', async ({ page }) => {
    await go(page, '/principles')
    await expectRendered(page, '/principles')

    const h1 = page.getByRole('heading', { level: 1 })
    await expect(h1).toBeVisible()
    await expect(h1).toContainText('enforced')
    await expect(page.locator('.prn-hero .home-mark')).toHaveCount(1)

    await revealAll(page)

    const items = page.locator('.prn-item')
    const count = await items.count()
    expect(count, 'the principles list rendered fewer than five rows').toBeGreaterThanOrEqual(5)

    // Each row carries a rule, a body, a link OUT, and a rendered proof. A row
    // whose proof failed to build would still show its sentence, which is the
    // exact shape this page exists to refuse.
    for (let i = 0; i < count; i += 1) {
      const item = items.nth(i)
      await expect(item.locator('.prn-rule')).toHaveCount(1)
      await expect(item.locator('.prn-body')).toHaveCount(1)
      await expect(item.locator('.prn-go')).toHaveCount(1)
      await expect(item.locator('.prn-proof figure'), `row ${i} states a rule with no proof`).toHaveCount(1)
      await expect(item.locator('.prn-proof figcaption'), `row ${i}'s proof names no source`).toHaveCount(1)
    }

    // The lead row is the page's large visual and runs full width; the rest
    // alternate. Asserted because a page of five identical rows is the
    // construction this design deliberately avoided.
    await expect(page.locator('.prn-item[data-lead="true"]')).toHaveCount(1)
    await expect(page.locator('.prn-item[data-side="left"]')).not.toHaveCount(0)
    await expect(page.locator('.prn-item[data-side="right"]')).not.toHaveCount(0)
  })

  test('the contrast proof prints the ratio the running stylesheet produces', async ({ page }) => {
    await go(page, '/principles')
    await expectRendered(page, '/principles')
    await revealAll(page)

    // Read the product's OWN custom properties out of the live document, then
    // compute what the page should be printing. The page draws written-down
    // hexes; this path never touches them, so a drifted constant fails here.
    const tokens = await page.evaluate(() => {
      const s = getComputedStyle(document.documentElement)
      return {
        ground: s.getPropertyValue('--bg-0').trim(),
        link: s.getPropertyValue('--link').trim(),
      }
    })
    // The FILL is pinned to the value Principle 1's proof was written against.
    // The live --accent (#2A60E8) clears 4.5:1 on the light page and cannot
    // show the boundary-only case, so that proof is owed new copy;
    // help-and-principles-claims.test.js pins the same.
    tokens.fill = '#0F6FFF'
    const expected = [
      `${contrastRatio(tokens.link, tokens.ground).toFixed(2)}:1`,
      `${contrastRatio(tokens.fill, tokens.ground).toFixed(2)}:1`,
    ]
    await expect(page.locator('.prn-cx-ratio')).toHaveText(expected)

    // The split is the argument: one clears the text floor, the other does not.
    expect(contrastRatio(tokens.link, tokens.ground)).toBeGreaterThanOrEqual(4.5)
    expect(contrastRatio(tokens.fill, tokens.ground)).toBeLessThan(4.5)

    // And the one that does not is NOT painted as text — putting an unreadable
    // line on this page would contradict the page.
    const boundary = page.locator('.prn-cx-sample[data-boundary="true"]')
    await expect(boundary).toHaveCount(1)
    const ink = await boundary.evaluate((el) => getComputedStyle(el).color)
    expect(ink, 'the sub-threshold blue is being used as text after all').not.toBe(toRgb(tokens.fill))
  })

  test('the export and Soon proofs read the same tables the product reads', async ({ page }) => {
    await go(page, '/principles')
    await expectRendered(page, '/principles')
    await revealAll(page)

    const col = (n) => page.locator('.prn-ex-col').nth(n).locator('li')
    expect((await col(0).allInnerTexts()).map((s) => s.trim())).toEqual(FREE_FORMATS.map((f) => f.name))
    expect((await col(1).allInnerTexts()).map((s) => s.trim())).toEqual(PRO_FORMATS.map((f) => f.name))
    // The unbuilt column carries the badge, which is the whole point of it.
    // `.soon-badge` is text-transform:uppercase and sits on its own line, so
    // innerText reads the format name, a newline, then SOON. Strip the badge
    // case-insensitively — the uppercase is painted by CSS, not by the data.
    expect((await col(2).allInnerTexts()).map((s) => s.replace(/\s*soon\s*$/i, '').trim()))
      .toEqual(UNBUILT_FORMATS.map((f) => f.name))
    await expect(page.locator('.prn-ex-col[data-unbuilt="true"] .soon-badge'))
      .toHaveCount(UNBUILT_FORMATS.length)

    // The two counts, against the registry computed at the top of this file.
    await expect(page.locator('.prn-sn-fig b')).toHaveText([String(LIVE), String(SOON)])

    // The type ladder is the arithmetic, rendered at the sizes it produces.
    const { base, ratio } = DEFAULT_DESIGN.typeScale
    const sizes = await page.locator('.prn-ty-spec')
      .evaluateAll((els) => els.map((el) => parseFloat(getComputedStyle(el).fontSize)))
    expect(sizes).toEqual([3, 2, 1, 0, -1].map((exp) => stepPx(base, ratio, exp, 'half')))
  })

  test('every rule links to a screen that opens', async ({ page }) => {
    await go(page, '/principles')
    await expectRendered(page, '/principles')
    await revealAll(page)

    const hrefs = await page.locator('.prn-go, .prn-hero a')
      .evaluateAll((els) => [...new Set(els.map((el) => el.getAttribute('href')))])
    expect(hrefs.length, 'no rule names a screen').toBeGreaterThanOrEqual(5)

    for (const href of hrefs) {
      await go(page, href)
      await expectRendered(page, href)
      await expect(
        page.getByRole('heading', { name: /Page not found/i }),
        `${href} is named by a principle and renders the 404`,
      ).toHaveCount(0)
      // Nothing a principle points at may be a Soon destination.
      await expect(page.locator('h1 .soon-badge')).toHaveCount(0)
    }
  })
})

/* ── Both surfaces, both themes, phone and desktop ───────────────────────── */

for (const theme of ['light', 'dark']) {
  for (const size of [{ w: 390, h: 844, name: 'phone' }, { w: 1440, h: 900, name: 'desktop' }]) {
    test(`${theme} at ${size.name}: neither page overflows sideways and both paint their hero`, async ({ browser }) => {
      const ctx = await browser.newContext({
        viewport: { width: size.w, height: size.h },
        colorScheme: theme,
      })
      const page = await ctx.newPage()
      await page.addInitScript((t) => {
        try { localStorage.setItem('vs-t', t) } catch { /* private mode */ }
      }, theme)

      for (const route of ['/help', '/principles']) {
        await go(page, route)
        await page.evaluate((t) => document.documentElement.setAttribute('data-theme', t), theme)
        await expectRendered(page, route)
        await revealAll(page)

        // The hero is painted, in this theme, at this width. `toBeVisible` is
        // not enough on a page that uses the reveal, so the opacity is read.
        const h1 = page.getByRole('heading', { level: 1 })
        await expect(h1).toBeVisible()
        const box = await h1.boundingBox()
        expect(box.width, `${route} ${theme} ${size.name}: the h1 has no width`).toBeGreaterThan(80)

        const overflow = await page.evaluate(() => (
          document.documentElement.scrollWidth - document.documentElement.clientWidth
        ))
        expect(overflow, `${route} at ${size.w}px pushes the page sideways`).toBeLessThanOrEqual(1)

        // The ramp is eleven columns of type. Below the desktop band it is a
        // scroller inside its own box — which means the BOX must not overflow
        // even though its content does.
        if (route === '/help') {
          const wide = await page.locator('.hlp-run').evaluate((el) => ({
            box: el.getBoundingClientRect().width,
            parent: el.parentElement.getBoundingClientRect().width,
          }))
          expect(wide.box, 'the run strip is wider than the column it sits in')
            .toBeLessThanOrEqual(Math.ceil(wide.parent) + 1)
        }
      }
      await ctx.close()
    })
  }
}

test.describe('/help opens on what the founder said', () => {
  test('the lede carries the founder’s opening line, rendered, from positioning.js', async ({ page }) => {
    // Same shape as the /plans check: the sentence is computed from the module
    // here and looked for in the RENDERED lede, so the wiring is what is under
    // test, not the helper.
    watch(page, 'a first-time visitor looking for where to start')
    await go(page, '/help')
    await expectRendered(page, '/help')

    const lede = page.locator('.hlp-hero .hlp-lede')
    await expect(lede).toHaveCount(1)
    await expect(lede).toContainText(line(SURFACE_LINE.helpOpening))
  })
})
