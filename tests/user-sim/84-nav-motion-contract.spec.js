// THE NAV'S MOTION CONTRACT.
//
// ─────────────────────────────────────────────────────────────────────────────
// WHY IT EXISTS
// ─────────────────────────────────────────────────────────────────────────────
// The founder's report was "the mega menu feels AI generated as well as the
// hover animation for the sub categories within the menu". Taken as a defect
// report rather than as taste, it resolved into one measurable rule that the
// panel was breaking in six places at once:
//
//   MOTION MUST COMMUNICATE STATE, AND IT MUST NOT MOVE A LAYOUT PROPERTY.
//
// `transform` and `opacity` are the only two properties the compositor can
// animate without a layout pass. Everything else — width, gap, padding, margin,
// grid tracks — forces the whole subtree to be laid out again on every frame,
// and what the user sees is content sliding out from under the pointer. The
// worst instance here was `transition:width` on `.pnav-menu`: the three
// sections are 1260 / 1200 / 960px wide, so crossing from Create to Learn
// interpolated 300px of panel over 25 painted widths and dragged the first tool
// row 150px sideways while the visitor was reaching for it.
//
// ─────────────────────────────────────────────────────────────────────────────
// WHY THIS ASSERTS ON COMPUTED STYLE AND NOT ON THE STYLESHEET
// ─────────────────────────────────────────────────────────────────────────────
// `global.css` declares `.pnav-tool` three times, 4,000 lines apart, and the
// last `transition` wins outright — a `transition` declaration REPLACES the one
// below it in the cascade rather than merging with it. So grepping the file for
// a property name proves nothing about what the element ends up with, in either
// direction: a rule can be present and dead, or absent and inherited from a
// block nobody thought to look at. The same trap already cost this repo a
// green run (see 64-computed-style-snapshot's note on `--radius-s`). Every
// assertion below therefore reads `getComputedStyle` on the rendered element.
//
// It also pairs each property with ITS OWN duration. `transition-property` and
// `transition-duration` are two lists that CSS cycles independently, so
// `transition: opacity .2s, width 0s` computes as property "opacity, width" —
// and a probe that only looked at the property list would report a width
// animation that can never run for a single frame. Only durations above zero
// count here.
//
// ─────────────────────────────────────────────────────────────────────────────
// WHY THE EXPECTATION IS AN EXACT SET AND NOT "ZERO"
// ─────────────────────────────────────────────────────────────────────────────
// Two layout transitions in this nav are deliberate, and both are already
// pinned by other specs. Asserting "none" would delete somebody's shipped work
// the first time it was run; asserting an exact set fails BOTH ways — when a
// seventh one grows back, and when one of the two the founder asked for goes
// missing.
//
//   · `.pnav-search-field` 300 → 390px on hover. Founder-directed, and
//     30-founder-requests-0808 holds the expansion, the typed placeholder and
//     the fact that the section menus and the theme cycle do not move when it
//     happens — sampled every frame of the transition. `transform` cannot do
//     this job — the field reflows its own text — and it moves nothing that is
//     not the control the pointer is already on, because it grows inside a
//     `.pnav-search` slot that already holds the expanded width. (This used to
//     be the wrapper growing, and it pushed the menus 90px on every hover once
//     the Spectrum flex row took away the grid's slack. The note here claimed
//     "0px", read from a test that measured before the hover had rendered.)
//   · `.pnav-cta`'s grid track. This one is NOT a hover: it is the sales-page
//     scroll gate, it fires once, and 24-mobile-overhaul's S15 asserts the
//     track interpolates rather than jump-cuts.
//
// ─────────────────────────────────────────────────────────────────────────────
// THE POSITIVE CONTROL
// ─────────────────────────────────────────────────────────────────────────────
// A sweep that finds nothing is indistinguishable from a sweep that looked
// nowhere. A bad selector, a panel that never opened, a helper that returned []
// — all of them paint this spec green while the defect ships. So the same probe
// function, unmodified, is run a second time against a stylesheet injected at
// run time that gives a nav element `transition: gap 1s`, and it must report
// exactly that element. That is the only evidence that the assertions above
// were reading live computed styles from real elements.
import { test, expect } from './base.js'
import { go, watch } from './helpers.js'

// An app route, not a sales one: `.pnav--sales` sets `display:none` on the
// search field, and an element that is not rendered cannot be shown to still
// carry the expansion the founder asked for.
const ROUTE = '/create/palette'

// The properties whose animation forces a layout pass. `all` is on the list
// because it is a superset of every one of them: a rule that says
// `transition:all` has opted into animating whichever of these happens to
// change, which is how `.nav-item` came to animate `font-weight` into its
// active state.
const LAYOUT_PROPS = [
  'all', 'width', 'height', 'gap', 'row-gap', 'column-gap',
  'padding', 'padding-top', 'padding-right', 'padding-bottom', 'padding-left',
  'margin', 'margin-top', 'margin-right', 'margin-bottom', 'margin-left',
  'grid-template-columns', 'grid-template-rows',
  'top', 'left', 'right', 'bottom', 'inset',
  'flex', 'flex-basis', 'font-size', 'line-height',
  'min-width', 'max-width', 'min-height', 'max-height', 'border-width',
]

// The two documented exceptions, by the class that carries them.
const ALLOWED = ['pnav-search-field', 'pnav-cta']

/**
 * Every element of the bar and the open panel that transitions a layout
 * property for longer than zero seconds.
 *
 * Returns `{ found, scanned }` — `scanned` exists so the caller can prove the
 * sweep had something to sweep. It is the count that turns "nothing is broken"
 * into a claim rather than a shrug.
 */
function layoutTransitions(page, layoutProps) {
  return page.evaluate((props) => {
    const LAYOUT = new Set(props)
    const roots = [document.querySelector('.pnav'), document.querySelector('#pnav-mega')].filter(Boolean)
    const seconds = (s) => s.split(',').map((v) => parseFloat(v) || 0)
    const found = []
    let scanned = 0
    for (const root of roots) {
      for (const el of [root, ...root.querySelectorAll('*')]) {
        scanned += 1
        const cs = getComputedStyle(el)
        const names = (cs.transitionProperty || '').split(',').map((s) => s.trim())
        const durs = seconds(cs.transitionDuration || '0s')
        // CSS cycles the shorter list, so property i takes duration i % len.
        const live = names
          .map((p, i) => ({ p, d: durs[i % durs.length] || 0 }))
          .filter((x) => x.d > 0 && LAYOUT.has(x.p))
        if (!live.length) continue
        found.push({
          // The class list is what an author greps for when this fails.
          className: typeof el.className === 'string' ? el.className : el.tagName.toLowerCase(),
          props: live.map((x) => `${x.p} ${x.d}s`),
        })
      }
    }
    return { found, scanned }
  }, layoutProps)
}

/** Open a section menu the way a pointer does, and wait for it to be named. */
async function openMenu(page, name = 'Create') {
  await page.getByRole('button', { name, exact: true }).click()
  await expect(page.getByRole('region', { name: `${name} menu` })).toBeVisible()
}

test.describe('the nav does not animate layout', () => {
  test('no element in the bar or the open panel transitions a layout property, beyond the two that are meant to', async ({ page }) => {
    watch(page, 'a visitor whose pointer is already moving toward a tool')
    await go(page, ROUTE)
    await openMenu(page)

    const { found, scanned } = await layoutTransitions(page, LAYOUT_PROPS)

    // The sweep must have had a nav to sweep. The panel alone is over a hundred
    // elements; a number near zero means the selectors missed, not that the
    // stylesheet is clean.
    expect(scanned, 'the sweep found almost no elements — it did not reach the nav').toBeGreaterThan(100)

    const offenders = found.filter((f) => !ALLOWED.some((c) => f.className.split(/\s+/).includes(c)))
    expect(
      offenders,
      `these nav elements animate a layout property:\n${offenders.map((o) => `  .${o.className} -> ${o.props.join(', ')}`).join('\n')}`,
    ).toEqual([])

    // And the two that are supposed to be there still are, so this spec cannot
    // be satisfied by deleting the founder's search expansion.
    const kept = found.map((f) => f.className.split(/\s+/).find((c) => ALLOWED.includes(c))).filter(Boolean)
    expect(new Set(kept), 'a documented layout transition went missing').toEqual(new Set(ALLOWED))
  })

  // ── THE POSITIVE CONTROL ──────────────────────────────────────────────────
  test('the probe reads live computed style — a layout transition injected at run time is caught', async ({ page }) => {
    watch(page, 'the probe proving it is not asleep')
    await go(page, ROUTE)
    await openMenu(page)

    const clean = await layoutTransitions(page, LAYOUT_PROPS)
    const before = clean.found.filter((f) => f.className.includes('pnav-toollist'))
    expect(before, '.pnav-toollist already animates a layout property — the control cannot prove anything').toEqual([])

    // Give one real nav element one real layout transition, through the
    // cascade, exactly as a careless edit to global.css would.
    await page.addStyleTag({ content: '.pnav-toollist{transition:gap 1s linear}' })

    const dirty = await layoutTransitions(page, LAYOUT_PROPS)
    const caught = dirty.found.filter((f) => f.className.includes('pnav-toollist'))
    expect(caught.length, 'the probe did not see a transition:gap that is definitely on the element').toBeGreaterThan(0)
    expect(caught[0].props.join(','), 'the probe saw the element but misread its property or duration').toContain('gap 1s')
    expect(dirty.scanned, 'the two sweeps did not look at the same nav').toBe(clean.scanned)
  })

  test('the panel opens with one animation, and it is opacity and transform only', async ({ page }) => {
    watch(page, 'a visitor opening Create once')
    await go(page, ROUTE)
    await openMenu(page)

    const open = await page.evaluate(() => {
      const menu = document.querySelector('#pnav-mega')
      const all = [menu, ...menu.querySelectorAll('*')].flatMap((el) => el.getAnimations())
      return all.map((a) => ({
        name: a.animationName || a.effect?.getKeyframes?.().length ? (getComputedStyle(a.effect.target).animationName || '') : '',
        // Which properties the keyframes actually touch.
        props: [...new Set(a.effect.getKeyframes().flatMap((k) => Object.keys(k)))]
          .filter((k) => !['offset', 'computedOffset', 'easing', 'composite'].includes(k)),
      }))
    })

    // One entrance for the panel. Not one per row, and not a second fade nested
    // inside the first.
    expect(open.length, `${open.length} animations play on a single open: ${JSON.stringify(open)}`).toBe(1)
    expect(new Set(open[0].props), 'the panel entrance animates something the compositor cannot').toEqual(
      new Set(['opacity', 'transform']),
    )
  })

  test('switching sections does not drag the tool rows sideways', async ({ page }) => {
    watch(page, 'a visitor comparing Create against Learn')
    await go(page, ROUTE)
    await openMenu(page, 'Create')

    // Sample per animation frame across the switch. A width transition shows up
    // here as many distinct widths and a row whose x keeps changing; a state
    // change shows up as one width and a row that is simply somewhere else.
    //
    // THE WINDOW ENDS WHEN THE PANEL HAS SETTLED, NOT AT A STOPWATCH. It used to
    // stop at 500ms, and CI's runner painted 7 frames in that time, which is too
    // few to say anything and failed "the sampler never ran". Now it samples
    // until nothing finite is animating inside the panel AND it has seen at
    // least MIN_FRAMES — counted in frames, so a runner that paints slowly buys
    // itself proportionally more wall-clock time, and a width transition of any
    // length is sampled to its end rather than cut off. The ms figure is only a
    // backstop for a page that has stopped painting; it decides nothing on one
    // that is still painting.
    const travel = await page.evaluate(async () => {
      const MIN_FRAMES = 30
      const MIN_MS = 500
      const BACKSTOP_MS = 8000
      const row = () => document.querySelector('#pnav-mega .pnav-tool')
      const settling = (menu) => menu.getAnimations({ subtree: true }).some((a) => a.playState === 'running'
        && a.effect?.getComputedTiming().endTime !== Infinity)
      const xs = []
      const widths = []
      document.querySelectorAll('.pnav-trigger')[2].click() // Learn
      const t0 = performance.now()
      await new Promise((done) => {
        const tick = () => {
          const menu = document.querySelector('#pnav-mega')
          if (!menu) return done()
          widths.push(Math.round(menu.getBoundingClientRect().width))
          const r = row()
          if (r) xs.push(Math.round(r.getBoundingClientRect().x))
          const elapsed = performance.now() - t0
          if (elapsed > BACKSTOP_MS) return done()
          if (widths.length >= MIN_FRAMES && elapsed >= MIN_MS && !settling(menu)) return done()
          return requestAnimationFrame(tick)
        }
        requestAnimationFrame(tick)
      })
      return {
        frames: widths.length,
        distinctWidths: new Set(widths).size,
        rowTravel: xs.length ? Math.max(...xs) - Math.min(...xs) : null,
      }
    })

    expect(travel.frames, 'the sampler never ran').toBeGreaterThan(10)
    expect(
      travel.distinctWidths,
      `the panel painted ${travel.distinctWidths} widths across the switch — it is interpolating its width again`,
    ).toBe(1)
    expect(
      travel.rowTravel,
      `a tool row moved ${travel.rowTravel}px horizontally while the visitor was reaching for it`,
    ).toBe(0)
  })

  test('a row hover moves nothing — it changes colour and shows its category rail', async ({ page }) => {
    watch(page, 'a visitor pointing at one tool')
    await go(page, ROUTE)
    await openMenu(page)

    const first = page.locator('#pnav-mega .pnav-tool').first()
    const read = () => first.evaluate((el) => ({
      icon: getComputedStyle(el.querySelector('.pnav-tool-ico')).transform,
      rowX: Math.round(el.getBoundingClientRect().x),
      background: getComputedStyle(el).backgroundColor,
      rail: getComputedStyle(el, '::before').opacity,
      railTransform: getComputedStyle(el, '::before').transform,
    }))

    const rest = await read()
    await first.hover()
    // The rail fades over --dur-1; poll rather than sleep.
    await expect.poll(async () => (await read()).rail).toBe('1')
    const hot = await read()

    expect(hot.icon, 'the tool icon lifts on hover again').toBe(rest.icon)
    expect(hot.rowX, 'the row moves when it is pointed at').toBe(rest.rowX)
    expect(hot.railTransform, 'the category rail grows instead of appearing').toBe(rest.railTransform)
    // And the state really is being reported, by two channels that are not motion.
    expect(hot.background, 'hover changed nothing the eye can use').not.toBe(rest.background)
    expect(rest.rail, 'the rail is showing at rest, so it marks nothing').toBe('0')
  })
})

test.describe('the menu stays operable and says what it did', () => {
  test('the trigger announces the panel it controls, and Escape gives focus back', async ({ page }) => {
    watch(page, 'a keyboard user opening and leaving the menu')
    await go(page, ROUTE)

    const create = page.getByRole('button', { name: 'Create', exact: true })
    await expect(create).toHaveAttribute('aria-expanded', 'false')

    await create.click()
    await expect(create).toHaveAttribute('aria-expanded', 'true')
    // The disclosure names the region it opened, and the region carries a name
    // a screen reader can read out. Both halves, because aria-controls pointing
    // at an unnamed region announces "region" and nothing else.
    await expect(create).toHaveAttribute('aria-controls', 'pnav-mega')
    await expect(page.getByRole('region', { name: 'Create menu' })).toBeVisible()

    await page.keyboard.press('Escape')
    await expect(create).toHaveAttribute('aria-expanded', 'false')
    await expect(page.getByRole('region', { name: 'Create menu' })).toHaveCount(0)
    await expect(create, 'Escape closed the panel and dropped focus on the floor').toBeFocused()
  })

  test('a focused row is marked the same way a hovered one is', async ({ page }) => {
    watch(page, 'a keyboard user who cannot hover')
    await go(page, ROUTE)
    await openMenu(page)

    // Keyboard parity is the reason the rail exists on :focus-visible as well as
    // :hover. Without it the arrow path through the panel is invisible, and the
    // only remaining marker would be the focus ring the browser draws.
    //
    // THE FOCUS HAS TO COME FROM THE KEYBOARD, NOT FROM el.focus(). Chromium
    // only matches `:focus-visible` when the focus arrived by a keyboard-shaped
    // route; a scripted `.focus()` after a pointer click matches `:focus` and
    // nothing else, so an otherwise identical version of this test reported a
    // missing rail on a nav that has one. Tabbing is also the path the user
    // actually takes, which is the better reason.
    const onARow = () => page.evaluate(() => document.activeElement?.classList?.contains('pnav-tool') === true)
    let steps = 0
    while (steps < 12 && !(await onARow())) {
      await page.keyboard.press('Tab')
      steps += 1
    }

    expect(await onARow(), `tabbing from the trigger never reached a tool row in ${steps} presses`).toBe(true)

    // Poll: the rail fades over --dur-1 and reading it on the frame the key
    // landed reports the value it is transitioning FROM. The end state is
    // discrete, so there is nothing to settle beyond it arriving.
    await expect
      .poll(() => page.evaluate(() => getComputedStyle(document.activeElement, '::before').opacity),
        { message: 'a focused row does not get the category rail a hovered one gets' })
      .toBe('1')

    const landed = await page.evaluate(() => ({
      outline: getComputedStyle(document.activeElement).outlineWidth,
      background: getComputedStyle(document.activeElement).backgroundColor,
    }))
    expect(landed.outline, 'a focused row has no visible ring').not.toBe('0px')
  })
})

test.describe('reduced motion', () => {
  // Both halves of the three-state contract. `data-reduced-motion` is written by
  // the boot script in index.html: an explicit boolean in `vs-appearance` wins,
  // and absent one the OS query is mirrored. A spec that only drove one of them
  // would go green on a build where the other had stopped resolving.
  for (const [how, setup] of [
    ['the OS preference', async (ctxOpts) => ({ ...ctxOpts, reducedMotion: 'reduce' })],
    ['the stored Settings choice', async (ctxOpts) => ctxOpts],
  ]) {
    test(`the panel does not animate under ${how}, and still reports its state`, async ({ browser }) => {
      const stored = how === 'the stored Settings choice'
      const ctx = await browser.newContext(await setup({ viewport: { width: 1440, height: 900 } }))
      const page = await ctx.newPage()
      watch(page, `a visitor with motion turned off via ${how}`)
      if (stored) {
        await page.addInitScript(() => {
          try { localStorage.setItem('vs-appearance', JSON.stringify({ reducedMotion: true })) } catch { /* private mode */ }
        })
      }
      await go(page, ROUTE)

      expect(
        await page.evaluate(() => document.documentElement.getAttribute('data-reduced-motion')),
        `${how} did not reach data-reduced-motion`,
      ).toBe('true')

      await openMenu(page)

      const durations = await page.evaluate(() => {
        const menu = document.querySelector('#pnav-mega')
        const row = menu.querySelector('.pnav-tool')
        const ms = (v) => Math.max(...v.split(',').map((s) => parseFloat(s) * (s.includes('ms') ? 1 : 1000) || 0))
        return {
          menuAnimation: ms(getComputedStyle(menu).animationDuration),
          rowTransition: ms(getComputedStyle(row).transitionDuration),
        }
      })
      // The global guard clamps to 0.01ms. Anything a human could perceive is a
      // guard that stopped reaching this surface.
      expect(durations.menuAnimation, 'the panel still plays its entrance with motion off').toBeLessThan(1)
      expect(durations.rowTransition, 'rows still ease with motion off').toBeLessThan(1)

      // THE POINT OF REDUCED MOTION IS NOT SILENCE, IT IS THAT NOTHING WAS
      // ONLY EVER SAID BY MOVING. The row still has to report that it is the
      // one being pointed at.
      const row = page.locator('#pnav-mega .pnav-tool').first()
      const rest = await row.evaluate((el) => getComputedStyle(el).backgroundColor)
      await row.hover()
      await expect
        .poll(() => row.evaluate((el) => getComputedStyle(el, '::before').opacity),
          { message: 'with motion off, a hovered row shows no category rail' })
        .toBe('1')
      expect(
        await row.evaluate((el) => getComputedStyle(el).backgroundColor),
        'with motion off, a hovered row is indistinguishable from a resting one',
      ).not.toBe(rest)

      await ctx.close()
    })
  }
})
