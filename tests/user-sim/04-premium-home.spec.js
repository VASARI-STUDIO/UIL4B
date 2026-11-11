// Premium-home regression coverage: the public promise, interactive proof and
// responsive information hierarchy must remain usable without animation.
import { test, expect } from './base.js'
import { go, goRaw, homeSectionsLoaded, ready, watch } from './helpers.js'
import { SPECTRUM_HERO } from '../../src/components/spectrum/spectrumHero.js'
import { TOOL_COUNT } from '../../src/components/spectrum/spectrumFacts.js'

const PERSONA = 'prospective UI-system builder'

async function useReducedMotion(page) {
  await page.addInitScript(() => {
    localStorage.setItem('vs-appearance', JSON.stringify({
      rounding: 'default',
      density: 'cozy',
      reducedMotion: true,
    }))
  })
}

test.describe('premium homepage', () => {
  test.use({ reducedMotion: 'reduce' })

  test('shows a quiet branded shell before the application script mounts', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    let releaseScript
    const scriptGate = new Promise((resolve) => { releaseScript = resolve })
    await page.route(/\/assets\/index-[^/]+\.js$/, async (route) => {
      await scriptGate
      await route.continue()
    })

    try {
      await goRaw(page, '/', { waitUntil: 'commit' })
      const shell = page.locator('#boot-shell')
      await expect(shell).toBeVisible()
      await expect(shell.getByRole('status')).toHaveText('Loading UIL4B')
      await expect(shell.locator('.boot-decoration')).toHaveAttribute('aria-hidden', 'true')
      const animationName = await shell.locator('.boot-card').first().evaluate(
        (element) => getComputedStyle(element, '::after').animationName,
      )
      expect(animationName).toBe('none')
    } finally {
      releaseScript()
    }

    await expect(page.locator('#boot-shell')).toHaveCount(0)
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  })

  /* ── The shell's headline and React's headline are the same pixels ─────────
   *
   * scripts/prerender.mjs writes the real hero headline into the served `/`
   * shell so the largest paint happens with the stylesheet rather than when the
   * entry chunk lands. Two claims rest on the shell and the hydrated headline
   * being indistinguishable:
   *
   *   LAYOUT. A shell headline anywhere but where React will put it is a layout
   *   shift. CLS on this page is 0.
   *
   *   THE METRIC. Chrome records a text element's LCP size on its first painted
   *   frame. The hydrated headline is a different DOM node, so if it paints a
   *   LARGER area than the shell's did it becomes a new candidate and LCP walks
   *   back to hydration with the page looking identical.
   *
   * So this reads the headline in both states of one page load (entry bundle
   * held, then released) and requires them equal: the h1's box, the highlighted
   * run's box, each line box the text lays out as, and the typographic
   * properties that decide where a headline wraps. A re-wrap shows up in the
   * line boxes before it shows up in any single number.
   *
   * It waits for the stylesheet first: read any earlier and both headlines
   * report the UA defaults and compare equal in a state the browser never
   * paints. Asserted below rather than assumed.
   *
   * Two widths: one phone, one desktop.
   */
  const HERO_GEOMETRY = () => {
    const round = (n) => Math.round(n * 100) / 100
    const box = (b) => ({ x: round(b.x), y: round(b.y), width: round(b.width), height: round(b.height) })
    // One box per laid-out line: the text's rects merged by row, so the result
    // does not depend on how the text is split into nodes.
    const lines = (node) => {
      const range = document.createRange()
      range.selectNodeContents(node)
      const rows = new Map()
      for (const r of range.getClientRects()) {
        if (r.width === 0) continue
        const key = `${Math.round(r.top)}:${Math.round(r.height)}`
        const row = rows.get(key)
        if (row) { row.left = Math.min(row.left, r.left); row.right = Math.max(row.right, r.right) }
        else rows.set(key, { left: r.left, right: r.right, top: r.top, height: r.height })
      }
      return [...rows.values()].map((r) => ({
        x: Math.round(r.left), y: Math.round(r.top), width: Math.round(r.right - r.left), height: Math.round(r.height),
      }))
    }
    const h1 = document.querySelector('.hh-h1')
    const mark = h1.querySelector('.hh-h1-mark')
    const cs = getComputedStyle(h1)
    return {
      text: h1.textContent.replace(/\s+/g, ' ').trim(),
      markText: mark ? mark.textContent.trim() : null,
      h1Box: box(h1.getBoundingClientRect()),
      markBox: mark ? box(mark.getBoundingClientRect()) : null,
      lines: lines(h1),
      markLines: mark ? lines(mark) : null,
      fontFamily: cs.fontFamily, fontSize: cs.fontSize, fontWeight: cs.fontWeight,
      lineHeight: cs.lineHeight, letterSpacing: cs.letterSpacing,
    }
  }

  for (const width of [390, 1440]) {
    test(`the pre-painted headline occupies the pixels React gives it, at ${width}px`, async ({ page }) => {
      test.setTimeout(60000)
      await page.setViewportSize({ width, height: 900 })

      let release
      const gate = new Promise((resolve) => { release = resolve })
      const hold = async (route) => { await gate; await route.continue() }
      await page.route(/\/assets\/index-[^/]+\.js$/, hold)

      let shell
      try {
        await goRaw(page, '/', { waitUntil: 'commit' })
        await page.waitForSelector('#boot-shell .hh-h1 .hh-h1-mark')
        // The render-blocking sheet, then the fonts. Nothing paints before the
        // first and a late second is the classic cause of a re-wrap.
        //
        // Asked of the link element, not of a filename: the test build names
        // its entry sheet differently from the production build.
        await page.waitForFunction(() => {
          const links = [...document.querySelectorAll('link[rel="stylesheet"]')]
          return links.length > 0 && links.every((l) => {
            try { return !!l.sheet && l.sheet.cssRules.length > 0 } catch { return false }
          })
        })
        // Not `document.fonts.status === 'loaded'`: that reads 'loaded' while the
        // headline face is still unrequested (a face is only fetched once text
        // that uses it has laid out), so the shell was measured in 'Geist
        // Fallback' and the comparison caught the face swap, not a drift.
        // `check` with the headline's own text is false until Geist itself is in.
        await page.waitForFunction(() => document.fonts.check('600 80px Geist', 'Your UI and brand kit, from one app.'))
        shell = await page.evaluate(HERO_GEOMETRY)
        // Positive control on the read itself. Before the stylesheet applies
        // this reports the UA's own h1 — 32px, bold, `letter-spacing: normal` —
        // and the comparison below would pass on a state nothing ever paints.
        // Asserted as "not the UA default" rather than against global.css's
        // actual value, so it stays a control instead of becoming a second place
        // the hero's tracking is written down.
        // The words the shell paints are the headline's words, with the
        // highlighted run wrapped as the headline module names it. A shell that
        // writes half the headline still paints something, so a bare "has
        // text" would pass.
        expect(
          shell.text,
          'the served `/` shell headline is not the page headline word for word: prerender wrote a different one, or none',
        ).toBe(SPECTRUM_HERO.text.replace(/\s+/g, ' ').trim())
        expect(shell.markText, 'the shell does not wrap the highlighted run').toBe(SPECTRUM_HERO.mark)
        expect(shell.lines.length, 'the shell headline laid out no line boxes').toBeGreaterThan(0)
        expect(shell.letterSpacing, 'the shell headline was read before the stylesheet applied').not.toBe('normal')
      } finally {
        release()
      }

      await ready(page, '/')
      const hydrated = await page.evaluate(HERO_GEOMETRY)
      await page.unroute(/\/assets\/index-[^/]+\.js$/, hold)

      expect(
        hydrated,
        `at ${width}px the headline React renders is not the headline the shell painted. `
        + 'Every property here comes from one set of rules, so a difference means the shell '
        + 'markup and the hero component have drifted apart, which costs a layout shift and '
        + 'hands Chrome a second, later LCP candidate.',
      ).toEqual(shell)
    })
  }

  test('communicates the product and proves it with a working preview', async ({ page }) => {
    await useReducedMotion(page)
    watch(page, PERSONA)
    await go(page, '/')

    // The headline names the output ("UI and brand kit"), not a category.
    const heading = page.getByRole('heading', { level: 1 })
    await expect(heading).toContainText(/UI and brand kit/i)

    // Absent on purpose: a category line above the headline, and a figure strip
    // under it. 70-anti-slop-marketing owns the rendered absence of invented
    // figures.
    await expect(page.locator('.home-hero-kicker'), 'the hero kicker tagline is back').toHaveCount(0)
    await expect(page.locator('.home-hero-stats'), 'the hero stat strip is back').toHaveCount(0)
    await expect(page.locator('.htools-facts'), 'the figure strip is back').toHaveCount(0)
    await expect(page.locator('.home-proof-item')).toHaveCount(0)

    // The bookmarks section is the proof. It states the live tool count (counted,
    // never typed), and the window's sidebar has one link per live tool, each to
    // that tool's route.
    // #bookmarks is an empty stand-in until the section's chunk arrives, and the
    // stand-in is replaced while the scroll below is under way, so wait for the
    // real sections first.
    await homeSectionsLoaded(page)
    const bench = page.locator('#bookmarks')
    await bench.scrollIntoViewIfNeeded()
    const lede = (await bench.locator('.bm-sub').innerText()).toLowerCase()
    expect(lede, 'the bookmarks sub-line no longer states the tool count the tree gives')
      .toContain(`${TOOL_COUNT} tools`)

    await expect(bench.locator('a[data-tool]'), 'one sidebar link per live tool').toHaveCount(TOOL_COUNT)
    for (const [name, href] of [
      ['Palette', '/create/palette'],
      ['Icon Library', '/create/icons'],
      ['Font Gallery', '/create/font-gallery'],
      ['File Converter', '/create/file-converter'],
    ]) {
      await expect(bench.getByRole('link', { name, exact: true }), `the "${name}" tool link`).toHaveAttribute('href', href)
    }

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    )
    expect(overflow).toBeLessThanOrEqual(1)
  })

  test('keeps the static tool list and calls to action readable on a phone', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await useReducedMotion(page)
    watch(page, PERSONA)
    await go(page, '/')

    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    // The hero's own call to action is a real link straight into the app, with
    // no sign-up gate, so it survives middle-click, "open in new tab" and a JS
    // failure.
    const cta = page.locator('#top .hh-go')
    await expect(cta).toBeVisible()
    await expect(cta).toHaveAttribute('href', '/projects')
    // The hero's second link goes to the plans page, not to a section.
    await expect(page.locator('#top .hh-ghost')).toHaveAttribute('href', '/plans')
    // Every live tool is a link in the bookmarks section on a phone as well.
    await expect(page.locator('#bookmarks a.bmp-tool')).toHaveCount(TOOL_COUNT)
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    )
    expect(overflow).toBeLessThanOrEqual(1)
  })

  test('the search pill names a shortcut that actually works', async ({ page }) => {
    await useReducedMotion(page)
    watch(page, PERSONA)
    await go(page, '/')

    // A keycap drawn on a control that does not answer the key is a lie the
    // user only discovers by pressing it.
    const keycap = page.locator('.spnav-search kbd')
    await expect(keycap).toBeVisible()
    const label = (await keycap.innerText()).trim()
    expect(label, 'the nav keycap no longer names a key').toMatch(/K$/i)

    // The hero's command bar owns the chord while it is on the page: the nav
    // palette stands down, and the bar takes focus. Control+K on this platform;
    // the page accepts either modifier.
    const heroInput = page.locator('#top .hcmd-input')
    const palette = page.getByRole('dialog', { name: /search/i })
    await expect(heroInput, 'the hero no longer mounts its command bar').toBeVisible()
    await expect(heroInput).not.toBeFocused()
    await page.keyboard.press('Control+k')
    await expect(heroInput, 'the keycap chord did not focus the hero command bar').toBeFocused()
    await expect(palette, 'the chord opened the nav palette as well as focusing the hero bar').toHaveCount(0)

    // "/" is still the nav palette's key, from anywhere that is not a text field.
    await heroInput.evaluate((el) => el.blur())
    await page.keyboard.press('/')
    await expect(palette, 'the slash key did not open the search').toBeVisible()
    await expect(palette.getByRole('combobox')).toBeFocused()
  })

  test('holds from 320px to 4K with no sideways scroll', async ({ page }) => {
    await useReducedMotion(page)
    watch(page, PERSONA)
    await go(page, '/')

    // The widths a visitor may arrive at. 320 is the narrowest phone in the
    // support matrix; 3840 is where a fluid clamp stops being tested by any
    // other spec in this suite.
    //
    // The sections below the first screen load after it, on idle or on the first
    // scroll, so the page is nudged and every section waited for before it is
    // measured; otherwise the sweep would measure the hero and empty stand-ins.
    await homeSectionsLoaded(page)

    for (const width of [320, 768, 1440, 3840]) {
      await page.setViewportSize({ width, height: 900 })
      await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))))
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      )
      expect(overflow, `the front door scrolls sideways at ${width}px`).toBeLessThanOrEqual(1)
    }
  })
})
