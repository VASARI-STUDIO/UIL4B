// Premium-home regression coverage: the public promise, interactive proof and
// responsive information hierarchy must remain usable without animation.
import { test, expect } from './base.js'
import { go, goRaw, ready, watch } from './helpers.js'
import { heroHeadlineText } from '../../src/data/positioning.js'

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
   * shell so the homepage's largest paint happens with the stylesheet rather
   * than ~1.8s later with the entry chunk (LCP 3662ms -> 1702ms mean on
   * scripts/home-field-metrics.mjs's profile, 10 cold runs each).
   *
   * That is only a win if the two headlines are indistinguishable, and it is
   * indistinguishable in a demanding sense — two SEPARATE claims rest on it:
   *
   *   LAYOUT. A shell headline anywhere but where React will put it is a
   *   layout shift dressed up as a performance win. CLS on this page is 0.
   *
   *   THE METRIC ITSELF. Chrome records a text element's LCP size on its first
   *   painted frame. The hydrated headline is a different DOM node, so if it
   *   paints a LARGER area than the shell's did it becomes a new candidate and
   *   LCP walks straight back to hydration — with the page looking identical
   *   and every other test still green.
   *
   * So this reads the hero in BOTH states of one page load, while the entry
   * bundle is held and again after it is released, and requires them equal.
   * Position, box, and the five typographic properties that change where a
   * headline wraps are all compared, because a re-wrap is how this breaks
   * without any single number looking wrong.
   *
   * IT WAITS FOR THE STYLESHEET FIRST, and that is not a nicety: read any
   * earlier and both headlines report the UA defaults (32px, bold, no tracking)
   * and the comparison passes on a state the browser never paints, since the
   * sheet is render-blocking. Asserted below rather than assumed.
   *
   * Two widths, the same pair 64-computed-style-snapshot uses. 360, 480, 768,
   * 1024, 1280 and 1920 were also measured identical by hand when this landed;
   * these two are the ones worth a place in the suite.
   */
  /* THE UNIT IS A WORD, NOT A LINE. Home.jsx split its headline into two
   * `.home-hero-line-in` spans; Spectrum's `<SpectrumWords>` splits it per word
   * into `.sp-w` inside a `.sp-wm` mask, and scripts/home-shell.mjs mirrors that
   * structure into the served shell. Measuring per word is strictly stronger
   * than per line: a re-wrap moves individual words before it moves a line box,
   * so this now catches a drift the two-line version could not see. */
  const HERO_GEOMETRY = () => [...document.querySelectorAll('.sp-hero-h1 .sp-w')].map((el) => {
    const b = el.getBoundingClientRect()
    const h1 = getComputedStyle(el.closest('.sp-hero-h1'))
    const round = (n) => Math.round(n * 100) / 100
    return {
      text: el.textContent.replace(/\s+/g, ' ').trim(),
      x: round(b.x), y: round(b.y), width: round(b.width), height: round(b.height),
      fontFamily: h1.fontFamily, fontSize: h1.fontSize, fontWeight: h1.fontWeight,
      lineHeight: h1.lineHeight, letterSpacing: h1.letterSpacing,
    }
  })

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
        await page.waitForSelector('#boot-shell .sp-hero-h1 .sp-w')
        // The render-blocking sheet, then the fonts. Nothing paints before the
        // first and a late second is the classic cause of a re-wrap.
        //
        // ASKED OF THE LINK ELEMENT, NOT OF A FILENAME. The first version of
        // this waited for a stylesheet whose href contained `/assets/index-`,
        // which is what `vite build` emits — but `vite build --mode test`, which
        // is what this suite runs against, adds four fixture HTML inputs and the
        // entry sheet becomes `global-<hash>.css`. The wait could never resolve
        // and both widths failed on the timeout with nothing wrong with the page.
        await page.waitForFunction(() => {
          const links = [...document.querySelectorAll('link[rel="stylesheet"]')]
          return links.length > 0 && links.every((l) => {
            try { return !!l.sheet && l.sheet.cssRules.length > 0 } catch { return false }
          })
        })
        await page.waitForFunction(() => document.fonts.status === 'loaded')
        shell = await page.evaluate(HERO_GEOMETRY)
        // Positive control on the read itself. Before the stylesheet applies
        // this reports the UA's own h1 — 32px, bold, `letter-spacing: normal` —
        // and the comparison below would pass on a state nothing ever paints.
        // Asserted as "not the UA default" rather than against global.css's
        // actual value, so it stays a control instead of becoming a second place
        // the hero's tracking is written down.
        // DERIVED FROM THE HEADLINE, never typed: one `.sp-w` per word. A shell
        // that writes half the headline still paints something, so a bare
        // "greater than zero" would pass on a truncated hero.
        expect(
          shell.length,
          'the served `/` shell headline is not the founder headline word for word — prerender wrote a different one, or none',
        ).toBe(heroHeadlineText().trim().split(/\s+/).length)
        expect(shell[0].letterSpacing, 'the shell headline was read before the stylesheet applied').not.toBe('normal')
      } finally {
        release()
      }

      await ready(page, '/')
      const hydrated = await page.evaluate(HERO_GEOMETRY)
      await page.unroute(/\/assets\/index-[^/]+\.js$/, hold)

      expect(
        hydrated,
        `at ${width}px the headline React renders is not the headline the shell painted. `
        + 'Every property here is produced by one set of rules in global.css, so a difference '
        + 'means the shell markup and src/pages/Spectrum.jsx have drifted apart — which costs a '
        + 'layout shift AND hands Chrome a second, later LCP candidate.',
      ).toEqual(shell)
    })
  }

  test('communicates the product and proves it with a working preview', async ({ page }) => {
    await useReducedMotion(page)
    watch(page, PERSONA)
    await go(page, '/')

    // The headline says what the product MAKES rather than naming a category.
    //
    // It used to be pinned verbatim ("Every design tool, / one search box
    // away."). That sentence is gone: a user told the founder the page read
    // instantly as "an AI-generated website", and a headline that could sit on
    // any design product was part of why. The full reasoning and the property
    // pins live in 10-home-chaos-to-calm, which owns this contract; here the
    // check is only that the hero still names the work.
    // THE EXPECTED WORDS CHANGED WITH THE HEADLINE, 2026-09-07. The hero now
    // carries a line assembled from the founder's own sentences ("Build and
    // export UI and brand design kits, in one unified location."), which names
    // the OUTPUT rather than the material — so the old
    // /colour|color|type|token|system/ probe no longer matches and would have
    // failed on a correct page. It is replaced, not deleted: the contract this
    // line stands for is that the h1 names the work, and "design kits" is how
    // the shipped headline names it. 10-home-chaos-to-calm still owns the
    // property pins.
    const heading = page.getByRole('heading', { level: 1 })
    await expect(heading).toContainText(/design kits|unified location/i)

    // THE KICKER ASSERTION IS GONE, AND ITS INVERSE TAKES ITS PLACE.
    // `.home-hero-kicker` carried "UI system toolkit"; the founder removed it
    // on 2026-09-07 — "these all over the place is a huge AI Slop feature" —
    // and asked that nothing replace it. So the check flips: the element must
    // be ABSENT, which is what stops a future edit quietly reinstating a
    // category line above the headline. Paired with the stat-strip check below,
    // which has the same shape and the same history.
    await expect(page.locator('.home-hero-kicker'), 'the hero kicker tagline is back').toHaveCount(0)
    await expect(page.locator('.home-hero-stats'), 'the hero stat strip is back').toHaveCount(0)

    // The figures moved beside the toolset grid on 2026-09-07 and were
    // removed from there on 2026-09-09: the founder marked the three-up
    // figure strip "AI" on the Font Gallery masthead and asked for the change
    // to reach every header that matches, and a figure strip under a section
    // heading matches. So this check flips the same way the kicker check did —
    // the strip must be ABSENT, wherever it is put. The mock's invented
    // "40+ TOOLS" cannot come back through a component that no longer exists;
    // 70-anti-slop-marketing.spec.js owns the rendered absence.
    await expect(page.locator('.htools-facts'), 'the figure strip is back').toHaveCount(0)
    await expect(page.locator('.home-proof-item')).toHaveCount(0)

    /* ── THE BENCH IS THE PROOF, AND ITS ARITHMETIC MUST AGREE WITH ITSELF ───
     *
     * The old page argued "eleven tools, five ways of working" with a tabbed
     * workbench. Spectrum argues the same thing with a numbered rail: five
     * category rows, each carrying a count, over five panels that each end at
     * the real tool.
     *
     * THE RAIL'S COUNTS MUST SUM TO THE HEADLINE'S NUMBER. This is the S6
     * defect written down as a test: the rail printed `panel.tools.length`
     * (live only) while the lede counted live-and-not-beta, so five rows summed
     * to fourteen a finger-width from a sentence saying thirteen. Summed here
     * rather than pinned per row, so re-tiering a tool moves both or fails.
     *
     * THE UNBUILT TOOL IS NOT ON THIS PAGE AT ALL. The old grid carried a "UI
     * Component Builder" card marked Soon, and this spec asserted the Soon
     * badge. Spectrum omits unbuilt tools instead of badging them, which keeps
     * the same honesty rule by a different route — nothing here claims a tool
     * that does not exist. The one shipped-but-unfinished tool DOES appear and
     * says so, which is the case worth guarding. */
    const rail = page.locator('.sp-rail-row')
    await expect(rail).toHaveCount(5)

    const counts = await rail.locator('.sp-rail-count').allTextContents()
    const summed = counts.reduce((total, n) => total + Number(n), 0)
    const lede = await page.locator('.sp-lede').first().innerText()
    expect(
      lede.toLowerCase(),
      'the bench lede no longer states a tool count, so the rail has nothing to agree with',
    ).toContain('thirteen')
    expect(
      summed,
      `the rail's five counts sum to ${summed} while the lede beside them says thirteen`,
    ).toBe(13)

    // Shipped but unfinished is declared, not hidden — the founder's rule is
    // that a tool on the shelf is never dressed up as more finished than it is.
    // Two tools carry the flag since the 3D Viewer shipped beside the Brand
    // Starter, so every label is checked rather than "the" label.
    const betas = page.locator('.sp-beta')
    await expect(betas.first()).toHaveText('Beta')
    expect(await betas.allTextContents()).toEqual(Array(await betas.count()).fill('Beta'))
    await expect(page.getByRole('link', { name: 'Brand Starter Beta' })).toHaveCount(1)
    await expect(page.getByRole('link', { name: '3D Viewer Beta' })).toHaveCount(1)

    // Each panel ends at the real tool rather than at a screenshot of it.
    const bench = page.locator('#bench')
    await bench.scrollIntoViewIfNeeded()
    await expect(page.locator('.sp-panel')).toHaveCount(5)
    await expect(page.getByRole('link', { name: /Open Colour System Generator/ }))
      .toHaveAttribute('href', '/create/palette')

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
    // The hero's own call to action. Signed out it is a real <Link> to the
    // sign-up, not a button — Home.jsx's reasoning, which Spectrum kept: a link
    // survives middle-click, "open in new tab" and a JS failure.
    await expect(page.locator('.sp-hero .sp-cta').first()).toBeVisible()
    // Every category still reachable from the front door on a phone.
    await expect(page.locator('.sp-rail-row')).toHaveCount(5)
    // The phone gets the calm stacked arrangement: the rail does not stick, so
    // the bench reads as one column instead of pinning a third of a small
    // screen. Same guarantee `.hsteps-sticky` used to give on the old page.
    const stickyPosition = await page.locator('.sp-rail-col').evaluate(
      (element) => getComputedStyle(element).position,
    )
    expect(stickyPosition).toBe('static')
    // The command bar is the hero's primary control and must be usable here.
    await expect(page.locator('.hcmd-input')).toBeVisible()
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    )
    expect(overflow).toBeLessThanOrEqual(1)
  })

  /* ── Carried over from 10-home-chaos-to-calm, which was deleted with Home.jsx
   *
   * That file's 25 tests described the old homepage's tabbed workbench — a page
   * the founder replaced. Most of what it asserted went with the page. These
   * two did not: the command bar and the width sweep are guarantees the FRONT
   * DOOR makes, whichever page is behind it, so they move here rather than die
   * with the file. */

  test('the ⌘K keycap names a shortcut that actually works', async ({ page }) => {
    await useReducedMotion(page)
    watch(page, PERSONA)
    await go(page, '/')

    // A keycap drawn on a control that does not answer the key is a lie the
    // user only discovers by pressing it. HomeCommandBar survived the redesign
    // — Spectrum mounts the same component in its hero — so the contract it
    // advertises has to survive with it.
    const keycap = page.locator('.hcmd-kbd').first()
    await expect(keycap).toBeVisible()
    const label = (await keycap.innerText()).trim()
    expect(label, 'the hero keycap no longer names a key').toMatch(/K$/i)

    // Control+K on this platform; the component accepts either modifier, and
    // the suite's Chromium reports a non-Apple platform.
    await page.keyboard.press('Control+k')
    await expect(page.locator('.hcmd-input')).toBeFocused()
  })

  test('holds from 320px to 4K with no sideways scroll', async ({ page }) => {
    await useReducedMotion(page)
    watch(page, PERSONA)
    await go(page, '/')

    // The four widths the old file swept, kept because the front door is the
    // one page every visitor lands on. 320 is the narrowest phone still in the
    // support matrix; 3840 is where a fluid clamp stops being tested by any
    // other spec in this suite.
    for (const width of [320, 768, 1440, 3840]) {
      await page.setViewportSize({ width, height: 900 })
      // The reveal observer and the hero's word stagger both move boxes, so the
      // measurement waits on the animation layer rather than on a stopwatch.
      await page.evaluate(async () => {
        await Promise.all((document.getAnimations?.() || []).map((a) => a.finished.catch(() => {})))
      })
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      )
      expect(overflow, `the front door scrolls sideways at ${width}px`).toBeLessThanOrEqual(1)
    }
  })
})
