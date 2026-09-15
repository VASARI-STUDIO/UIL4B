// The marketing and wayfinding surfaces, measured across the whole width
// matrix — 320, 360, 390, 430, 768, 834, 1024, 1280, 1440, 1920 — on RENDERED
// GEOMETRY and COMPUTED ROLES rather than on markup.
//
// Every assertion in here is the shipped form of something that was measured
// wrong first. The four it was written for:
//
// 1. THE GALLERY MASTHEAD'S DEAD SPACE (founder decision, 2026-09-13).
//    .dgh-hero carried `min-height` (300px, 280 below 720px) together with
//    `align-items:end`. Those two declarations together mean the box cannot be
//    right at two content lengths at once: the floor holds it open, the end
//    alignment drops the copy to the bottom, and the difference is painted
//    black ABOVE the headline. So the masthead with LESS in it got the bigger
//    hole. Three passes tuned the floor — 430, 300, 280 — and each one was
//    tuning the wrong number. Measured on the shipped build with both template
//    sentences still in place it was still 70px at 768 and 59px at 834 on
//    /discover/palettes, and deleting the Palette Library sentence against it
//    took that to 189px past the padding — 217px from the top border to the top
//    of the h1 in a 280px box at 320px, 68% of the masthead, worst on a phone
//    rather than on a desktop.
//    The floor is gone and `align-items` is `start`. This file asserts the
//    RULE (no floor, box equals content plus padding) at every width, because
//    the failure was never one number — it was the shape of the declaration.
//
// 2. THE SAME HOLE FROM THE OTHER SIDE, which no floor test could have seen.
//    In the two-column `--controls` variant the row's height is the TALLER
//    column, so when that is the aside, `align-items:end` pushes the copy down
//    and the black lands above the h1 with no spare height in the box at all.
//    /create/emoji measured 94px at 768 and 82px at 834 that way. Hence
//    `emptyAboveH1` beside `dead`: two numbers because there are two mechanisms.
//
// 3. SC 2.5.8 ON TWO SURFACES THIS SUITE HAD NEVER MEASURED. /discover/resources
//    painted 19 row-title links and 5 hand-off links at 19.8px at EVERY width,
//    and all seven /learn guides painted their breadcrumb's "Learn" link — the
//    only way back to the index from the top of the article — at 36.3x18.1px.
//    The written reason the row title was exempt was that it "also carries a
//    PriceTag", and that is not what the Inline exception says: a link beside a
//    badge in a flex container is not in a sentence and its line box is not set
//    by non-target text.
//
// 4. A LANDMARK IS WHAT THE ACCESSIBILITY TREE SAYS IT IS. A named <section>
//    is a region; an unnamed one is `generic` and takes no accessible name at
//    all. Reading that off the markup produced three separate defects in this
//    programme, so the landmark test below reads Chrome's own AX tree.
import { test, expect } from './base.js'
import { go } from './helpers.js'

// The full matrix. Every one of these is checked for the masthead rule; the
// slower sweeps take the four that have historically broken.
const WIDTHS = [320, 360, 390, 430, 768, 834, 1024, 1280, 1440, 1920]
const KEY_WIDTHS = [320, 390, 768, 1440]

// Every surface that renders the shared Discover masthead. Two are Create
// routes, which is the point: the component is shared, and the `--controls`
// variant only exists on those two.
const MASTHEAD_ROUTES = [
  '/discover/palettes',
  '/discover/gradients',
  '/discover/prompts',
  '/discover/resources',
  '/create/icons',
  '/create/emoji',
]

// The marketing and wayfinding set this lane owns.
const MARKETING_ROUTES = [
  '/', '/plans', '/help', '/info', '/principles', '/privacy', '/terms', '/sitemap',
  '/learn', '/discover', '/community',
]
const LEARN_GUIDES = [
  '/learn/colour-contrast', '/learn/type-scales', '/learn/typeface-metrics',
  '/learn/font-loading', '/learn/colour-spaces', '/learn/theme-systems',
  '/learn/brand-colour',
]

// ── The masthead probe ──────────────────────────────────────────────────────
// Content is the UNION BOX of the hero's children, not the sum of their
// heights. The sum is wrong in both layouts: stacked, it misses the grid gap
// and reports a declared 32px gap as dead space; side by side, it counts both
// columns and goes NEGATIVE, which is exactly how /create/emoji hid 94px of
// black above its h1 behind a reading of dead: -64.
const MASTHEAD = `(() => {
  const vis = (sel) => [...document.querySelectorAll(sel)].filter((e) => e.offsetParent !== null)[0]
  const hero = vis('.dgh-hero')
  if (!hero) return null
  const cs = getComputedStyle(hero)
  const padTop = parseFloat(cs.paddingTop)
  const padBottom = parseFloat(cs.paddingBottom)
  const hb = hero.getBoundingClientRect()
  const kids = [...hero.children].filter((e) => e.offsetParent !== null).map((e) => e.getBoundingClientRect())
  if (!kids.length) return null
  const top = Math.min(...kids.map((b) => b.top))
  const bottom = Math.max(...kids.map((b) => b.bottom))
  const h1 = vis('.dgh-hero h1')
  return {
    minHeight: cs.minHeight,
    alignItems: cs.alignItems,
    heroH: Math.round(hb.height),
    contentH: Math.round(bottom - top),
    padY: Math.round(padTop + padBottom),
    dead: Math.round(hb.height - (bottom - top) - padTop - padBottom),
    emptyAboveH1: h1 ? Math.round(h1.getBoundingClientRect().top - hb.top - padTop) : null,
    h1Text: h1 ? (h1.textContent || '').trim() : null,
    docOverflowX: document.documentElement.scrollWidth - document.documentElement.clientWidth,
  }
})()`

test.describe('the Discover masthead is sized by its content at every width', () => {
  for (const width of WIDTHS) {
    test(`at ${width}px no gallery masthead holds a hole open`, async ({ browser }) => {
      const ctx = await browser.newContext({
        viewport: { width, height: 900 }, isMobile: width <= 834, hasTouch: width <= 834,
      })
      const page = await ctx.newPage()
      const bad = []
      const measured = []
      for (const route of MASTHEAD_ROUTES) {
        await go(page, route)
        await expect(page.locator('.dgh-hero')).toBeVisible()
        await page.waitForTimeout(140)
        const m = await page.evaluate(MASTHEAD)
        if (!m || !m.h1Text) continue
        measured.push(route)

        // THE RULE, not a tuned number: nothing may declare a floor here. This
        // is the declaration that produced every version of the hole, and it is
        // asserted by name so a future pass cannot reintroduce it with a
        // "better" value and pass the pixel checks at the widths it happened to
        // pick.
        if (!/^(0px|auto)$/.test(m.minHeight)) {
          bad.push(`  ${route} @${width}: .dgh-hero declares min-height:${m.minHeight}`)
        }
        // The box equals what is in it. 4px of slack is sub-pixel rounding on
        // the padding clamp, nothing more.
        if (m.dead > 4) {
          bad.push(`  ${route} @${width}: ${m.dead}px of empty masthead `
            + `(hero ${m.heroH}, content ${m.contentH}, padding ${m.padY})`)
        }
        // The founder's own framing, and the only one that catches the
        // two-column case, where the box has no spare height and still paints
        // black above the headline.
        if (m.emptyAboveH1 > 4) {
          bad.push(`  ${route} @${width}: ${m.emptyAboveH1}px of black between the `
            + 'masthead top padding and the top of its h1')
        }
        // The slab is still a slab: the padding was not trimmed away to chase
        // the same number from the other side.
        if (m.padY < 50) bad.push(`  ${route} @${width}: masthead padding is down to ${m.padY}px`)
        // And the page never scrolls sideways because of it.
        if (m.docOverflowX > 0) {
          bad.push(`  ${route} @${width}: the document scrolls horizontally by ${m.docOverflowX}px`)
        }
      }
      await ctx.close()

      // POSITIVE CONTROL. `bad` is empty both when nothing is wrong and when
      // the probe read nothing at all — a renamed class, a lazy chunk that
      // never arrived, a route that 404s. Assert it saw every surface.
      expect(measured, `the masthead probe read nothing at ${width}px`)
        .toEqual(MASTHEAD_ROUTES)
      expect(bad.join('\n'), `masthead geometry at ${width}px`).toBe('')
    })
  }

  // The deleted sentences, pinned by absence. Both mastheads ran the same
  // template line and the founder deleted both; the replacement, if there ever
  // is one, is his to write, so this asserts the template cannot come back
  // rather than asserting any particular wording.
  test('neither library masthead runs the shared template sentence', async ({ page }) => {
    let checked = 0
    for (const route of ['/discover/palettes', '/discover/gradients']) {
      await go(page, route)
      await expect(page.locator('.dgh-hero')).toBeVisible()
      const copy = await page.evaluate(() => {
        const el = [...document.querySelectorAll('.dgh-copy')].filter((e) => e.offsetParent !== null)[0]
        return el ? (el.textContent || '').trim() : null
      })
      expect(copy, `${route}: no .dgh-copy on screen`).toBeTruthy()
      checked += 1
      expect(copy, `${route} still runs the template masthead sentence`)
        .not.toMatch(/point of view/i)
      expect(copy, `${route} still runs the template masthead sentence`)
        .not.toMatch(/make it yours/i)
    }
    expect(checked, 'read neither masthead').toBe(2)
  })
})

// ── SC 2.5.8 across the marketing set ───────────────────────────────────────
// The Inline exception is implemented rather than assumed: a target is exempt
// only when it sits inside a run of NON-TARGET text in the same block. A block
// link that is the whole of its heading is not, whatever else the heading holds
// beside it.
const TARGETS = `(() => {
  const OPERABLE = 'a[href],button,input:not([type=hidden]),select,textarea,summary,'
    + '[role=button],[role=tab],[role=link],[role=switch],[role=checkbox],[role=menuitem]'
  const small = []
  let examined = 0
  for (const el of document.querySelectorAll(OPERABLE)) {
    if (!el.offsetParent) continue
    const cs = getComputedStyle(el)
    // Not operable: invisible, or explicitly not a pointer target (the nav's
    // scroll-gated CTA sits at opacity 0 with pointer-events:none until the
    // visitor reaches the workbench, and is aria-hidden and untabbable with it).
    if (cs.visibility === 'hidden' || parseFloat(cs.opacity) === 0) continue
    if (cs.pointerEvents === 'none') continue
    const b = el.getBoundingClientRect()
    if (b.width === 0 || b.height === 0) continue
    examined += 1
    if (Math.min(b.width, b.height) >= 23.5) continue
    // The Inline exception, applied properly: the element must render inline
    // AND sit inside a block that carries meaningfully more text than it does.
    const inlineBox = cs.display === 'inline'
    const p = el.parentElement
    const around = p ? (p.textContent || '').trim().length - (el.textContent || '').trim().length : 0
    if (inlineBox && around > 3) continue
    small.push({
      sel: el.tagName.toLowerCase()
        + (typeof el.className === 'string' && el.className ? '.' + el.className.trim().split(/\\s+/).slice(0, 2).join('.') : ''),
      label: (el.getAttribute('aria-label') || el.textContent || '').replace(/\\s+/g, ' ').trim().slice(0, 40),
      w: +b.width.toFixed(1), h: +b.height.toFixed(1), display: cs.display,
    })
  }
  return { small, examined }
})()`

test.describe('every standalone control on the marketing set clears 24px', () => {
  for (const width of KEY_WIDTHS) {
    test(`at ${width}px nothing standalone is under 24px`, async ({ browser }) => {
      const ctx = await browser.newContext({
        viewport: { width, height: 900 }, isMobile: width <= 834, hasTouch: width <= 834,
      })
      const page = await ctx.newPage()
      const bad = []
      let examined = 0
      // The two surfaces that were failing, plus the pages that carry the most
      // controls. /discover/resources is the whole outbound half of a page;
      // /learn/colour-contrast is the guide with the most citations.
      for (const route of ['/discover/resources', '/learn/colour-contrast', '/learn/brand-colour',
        '/discover', '/sitemap', '/plans']) {
        await go(page, route)
        await page.waitForTimeout(140)
        const r = await page.evaluate(TARGETS)
        examined += r.examined
        for (const t of r.small) {
          bad.push(`  ${route} @${width}: ${t.sel} ${t.w}x${t.h} (display:${t.display}) "${t.label}"`)
        }
      }
      await ctx.close()
      // POSITIVE CONTROL. A selector that matches nothing reports no failures.
      expect(examined, `the target probe examined ${examined} controls at ${width}px`)
        .toBeGreaterThan(120)
      expect(bad.join('\n'), `controls under WCAG 2.2 SC 2.5.8 at ${width}px`).toBe('')
    })
  }

  // Named on its own, because this one link is the only route back to the index
  // from the top of an article and it is on all seven guides.
  test('every Learn guide can be left by its breadcrumb', async ({ page }) => {
    const bad = []
    let checked = 0
    for (const route of LEARN_GUIDES) {
      await go(page, route)
      const crumb = page.locator('.lart-crumb a').first()
      await expect(crumb).toBeVisible()
      const box = await crumb.boundingBox()
      const href = await crumb.getAttribute('href')
      checked += 1
      if (!box || box.height < 23.5) bad.push(`  ${route}: crumb link is ${box ? box.height : '?'}px tall`)
      if (href !== '/learn') bad.push(`  ${route}: crumb link points at ${href}, not /learn`)
    }
    expect(checked, 'read no breadcrumbs').toBe(LEARN_GUIDES.length)
    expect(bad.join('\n'), 'the Learn breadcrumb').toBe('')
  })
})

// ── Landmarks and headings, from Chrome's accessibility tree ────────────────
test.describe('the marketing set exposes a usable landmark list', () => {
  for (const width of [390, 1440]) {
    test(`at ${width}px every landmark is named or is not a landmark`, async ({ browser }) => {
      const ctx = await browser.newContext({
        viewport: { width, height: 900 }, isMobile: width <= 834, hasTouch: width <= 834,
      })
      const page = await ctx.newPage()
      const bad = []
      let pages = 0
      for (const route of MARKETING_ROUTES) {
        await go(page, route)
        await page.waitForTimeout(140)
        // MEASURED AFTER SCROLLING, because this walks every marketing route
        // and several of them reveal on scroll. It is no longer a workaround.
        //
        // Until 2026-09-15 it was one. useHomeMotion.js opened every
        // `[data-reveal]` with GSAP `autoAlpha:0` — opacity PLUS
        // `visibility:hidden` — and visibility:hidden takes an element out of
        // the accessibility tree completely, so Chrome's tree on `/` held 6 of
        // 17 headings and read h1 then five h3s with not one of the five h2s
        // between them, a two-level skip at 390 and 1440 alike. This walked the
        // page first so it could assert the outline a reader ENDS UP with, and
        // recorded in this note that the load-time outline was wrong and was
        // not asserted. The reveals animate plain opacity now, so the outline
        // is correct before anything is scrolled and the new test below asserts
        // that directly. The scroll walk stays: the other five routes need it.
        await page.evaluate(async () => {
          const step = Math.round(window.innerHeight * 0.8)
          for (let y = 0; y <= document.body.scrollHeight; y += step) {
            window.scrollTo(0, y)
            await new Promise((r) => requestAnimationFrame(() => setTimeout(r, 60)))
          }
          window.scrollTo(0, 0)
          await new Promise((r) => setTimeout(r, 150))
        })
        await page.waitForTimeout(200)
        // CHROME'S OWN TREE, over CDP, not the markup and not Playwright's
        // `page.accessibility` (removed in 1.61). `Accessibility.getFullAXTree`
        // is what a screen reader is handed: a <section> with no accessible
        // name never appears here as a region at all, it is `generic` — which is
        // the fact that produced three defects in this programme when it was
        // read off the tags instead.
        const cdp = await page.context().newCDPSession(page)
        await cdp.send('Accessibility.enable')
        const { nodes } = await cdp.send('Accessibility.getFullAXTree')
        await cdp.detach().catch(() => {})
        // WALK childIds, DO NOT ITERATE THE ARRAY. getFullAXTree returns a flat
        // node list that is NOT in document order — on `/` it hands back all
        // five h2s, then the h1, then the h3s — so reading heading order off
        // the array reports a permanent h1 -> h3 skip that does not exist.
        const LANDMARKS = ['region', 'navigation', 'main', 'banner', 'contentinfo', 'complementary', 'search', 'form']
        const byId = new Map(nodes.map((n) => [n.nodeId, n]))
        const landmarks = []
        const headings = []
        const seen = new Set()
        const walk = (id) => {
          const n = byId.get(id)
          if (!n || seen.has(id)) return
          seen.add(id)
          if (!n.ignored) {
            const role = n.role?.value
            const name = (n.name?.value || '').trim()
            if (LANDMARKS.includes(role)) landmarks.push({ role, name })
            if (role === 'heading') {
              const lvl = n.properties?.find((x) => x.name === 'level')?.value?.value
              headings.push({ level: Number(lvl) || 0, name })
            }
          }
          for (const c of n.childIds || []) walk(c)
        }
        const childOf = new Set(nodes.flatMap((n) => n.childIds || []))
        for (const n of nodes) if (!childOf.has(n.nodeId)) walk(n.nodeId)
        pages += 1

        // One main, and it is announced.
        const mains = landmarks.filter((l) => l.role === 'main')
        if (mains.length !== 1) bad.push(`  ${route} @${width}: ${mains.length} main landmarks`)
        // A region with no name is worse than no region: it is a stop on the
        // landmark list that says nothing.
        for (const l of landmarks) {
          if ((l.role === 'region' || l.role === 'complementary' || l.role === 'form') && !l.name) {
            bad.push(`  ${route} @${width}: an unnamed ${l.role} is on the landmark list`)
          }
        }
        // Exactly one h1, and the outline never skips a level.
        const h1s = headings.filter((h) => h.level === 1)
        if (h1s.length !== 1) bad.push(`  ${route} @${width}: ${h1s.length} level-1 headings`)
        let prev = 0
        for (const h of headings) {
          if (prev && h.level > prev + 1) {
            bad.push(`  ${route} @${width}: heading order skips h${prev} -> h${h.level} at "${h.name.slice(0, 40)}"`)
          }
          prev = h.level
        }
        if (!headings.length) bad.push(`  ${route} @${width}: the accessibility tree exposes no headings at all`)
      }
      await ctx.close()
      expect(pages, 'walked no routes').toBe(MARKETING_ROUTES.length)
      expect(bad.join('\n'), `landmarks and heading order at ${width}px`).toBe('')
    })
  }
})

// ── The two legal pages ─────────────────────────────────────────────────────
// ── THE HOMEPAGE HEADLINE IS SIZED BY HEIGHT AS WELL AS WIDTH ───────────────
//
// Founder, 2026-09-15, with a screenshot of his own window: "on smaller
// desktop pages the scale seems too large."
//
// `.home-hero-h1` was `clamp(46px, 6.6vw, 96px)` — viewport WIDTH only. A
// laptop is wide and short, so the width said "big screen" while the height
// said the opposite, and the headline's share of the screen climbed as the
// window got shorter. Measured on the built preview before the fix:
//
//   1920x1080   96px   365px   34% of the viewport   <- the design
//   1656x910    96px   365px   40%                   <- his window
//   1512x850    96px   365px   43%
//   1440x780    95px   361px   46%
//   1366x768    90px   343px   45%
//
// It wraps to four lines at every desktop width from 960 to 1920, and nothing
// was below the fold at any size — so this was never overflow, it was
// proportion, which is why the assertion is a SHARE and not a pixel count.
//
// The other five large heroes on the site were measured the same way and none
// of them needed the fix; /create/font-gallery is next at 25% and the rest sit
// under 13%. So this test covers the one headline that had the problem, and
// the last case fences the others so a later pass cannot "harmonise" them onto
// a rule they never needed.
//
// MUTATION: put the width-only clamp back — 1440x780, 1512x850 and 1366x768
// all report a share over the ceiling, and 1920x1080 keeps passing, which is
// the point: the old rule was right at one size and wrong at five.
const HERO_VIEWPORTS = [
  [1920, 1080], [1656, 910], [1512, 850], [1440, 900], [1440, 780],
  [1366, 768], [1280, 720], [1100, 700], [1024, 640],
]

test.describe('the homepage headline keeps its proportion on a short desktop', () => {
  for (const [width, height] of HERO_VIEWPORTS) {
    test(`at ${width}x${height} the headline is not most of the screen`, async ({ browser }) => {
      const ctx = await browser.newContext({ viewport: { width, height } })
      const page = await ctx.newPage()
      await go(page, '/')
      const h1 = page.locator('.home-hero-h1')
      await expect(h1).toBeVisible()
      await page.waitForTimeout(160)

      const m = await page.evaluate(() => {
        const el = document.querySelector('.home-hero-h1')
        const r = el.getBoundingClientRect()
        const hint = document.querySelector('.home-hero-hint')?.getBoundingClientRect()
        return {
          fs: Math.round(parseFloat(getComputedStyle(el).fontSize) * 10) / 10,
          height: Math.round(r.height),
          share: Math.round((r.height / window.innerHeight) * 100),
          hintBottom: hint ? Math.round(hint.bottom) : null,
          viewport: window.innerHeight,
        }
      })
      await ctx.close()

      // 38, not 36: the fixed value is 36 at every size and 34 at 1920, so this
      // leaves two points for a font metric moving a pixel and still sits below
      // every reading that was reported broken — 39, 40, 43, 45 and 46. 40
      // would have been the obvious ceiling and it is the wrong one: his own
      // window measured exactly 40, so the case that was reported would have
      // passed the test written to catch it.
      expect(m.share, `the headline is ${m.height}px of a ${m.viewport}px viewport at ${width}x${height}`)
        .toBeLessThanOrEqual(38)

      // POSITIVE CONTROL. The rule above is satisfied by a headline that has
      // shrunk to nothing, or by one that has stopped rendering. It is still
      // the largest type on the page and the hero still fits above the fold.
      expect(m.fs, 'the headline has collapsed').toBeGreaterThanOrEqual(46)
      expect(m.hintBottom, 'the hero no longer fits above the fold').toBeLessThanOrEqual(m.viewport)
    })
  }
})

test('the height rule is on the homepage headline and nowhere else', async ({ browser }) => {
  // FENCE. Five other heroes were measured at 1440x780 and sat at 25% or less,
  // so none of them needs a height term — and adding one to a masthead that is
  // already small would shrink it for no reason. This pins which heroes were
  // examined and what they measured, so a later sweep has to re-measure rather
  // than assume the rule generalises.
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 780 } })
  const page = await ctx.newPage()
  const OTHERS = [
    ['/discover/palettes', '.dgh-hero h1', 20],
    ['/create/font-gallery', '.fg-hero h1', 30],
    ['/create/font-pair', '.fpr-hero h1', 20],
    ['/create/tint', '.tt-hero h1', 20],
  ]
  const over = []
  for (const [route, sel, ceiling] of OTHERS) {
    await go(page, route)
    const m = await page.evaluate((s) => {
      const el = document.querySelector(s)
      if (!el) return null
      const r = el.getBoundingClientRect()
      return { share: Math.round((r.height / window.innerHeight) * 100), h: Math.round(r.height) }
    }, sel)
    if (!m) { over.push(`${route}: ${sel} is not rendering`); continue }
    if (m.share > ceiling) over.push(`${route}: ${m.h}px, ${m.share}% of the viewport (was under ${ceiling}%)`)
  }
  await ctx.close()
  expect(over, `a hero this lane left alone has grown:\n  ${over.join('\n  ')}`).toEqual([])
})

test('/terms and /privacy set a section heading the same way', async ({ page }) => {
  // Founder decision, 2026-09-13. /terms ran .legal-h--sm (16px, body font,
  // weight 700) where /privacy ran .legal-h (22px, display, 500) — the same
  // content type, the same <h2>, two answers. This compares the COMPUTED type,
  // so it fails whether the divergence comes back as a class, an inline style
  // or a new modifier.
  const read = async (route) => {
    await go(page, route)
    const h2 = page.locator('.legal-card h2').first()
    await expect(h2).toBeVisible()
    return page.evaluate(() => {
      const el = [...document.querySelectorAll('.legal-card h2')].filter((e) => e.offsetParent !== null)[0]
      if (!el) return null
      const cs = getComputedStyle(el)
      return { fontSize: cs.fontSize, fontFamily: cs.fontFamily, fontWeight: cs.fontWeight, text: (el.textContent || '').trim() }
    })
  }
  const privacy = await read('/privacy')
  const terms = await read('/terms')
  // POSITIVE CONTROL: both reads landed on a real heading with real text.
  expect(privacy?.text, '/privacy: read no section heading').toBeTruthy()
  expect(terms?.text, '/terms: read no section heading').toBeTruthy()
  expect(terms.fontSize, 'the two legal pages set their section headings at different sizes').toBe(privacy.fontSize)
  expect(terms.fontFamily, 'the two legal pages set their section headings in different families').toBe(privacy.fontFamily)
  expect(terms.fontWeight, 'the two legal pages set their section headings at different weights').toBe(privacy.fontWeight)
  // And the size that survived is the display one, not the body one — the
  // inconsistency could otherwise be "fixed" by shrinking /privacy.
  expect(parseFloat(terms.fontSize), 'the legal section heading has shrunk to body size').toBeGreaterThanOrEqual(20)
})

// ── /discover's description ─────────────────────────────────────────────────
test('/discover does not describe its own libraries as external', async ({ page }) => {
  // The sentence Google prints under the result and every share card shows.
  // It called eight groups "the best external design resources"; seven of them
  // are UI L4B's own libraries and two are badged Soon. Asserted against the
  // claims rather than the wording, so the founder can rewrite the sentence
  // without rewriting the test.
  await go(page, '/discover')
  const description = await page.evaluate(() =>
    document.querySelector('meta[name="description"]')?.getAttribute('content') || null)
  expect(description, '/discover has no meta description at all').toBeTruthy()
  expect(description.length, `/discover's description is ${description.length} chars, past what Google renders`)
    .toBeLessThanOrEqual(165)
  expect(description, '/discover claims to be a directory of external resources').not.toMatch(/\bexternal design resources\b/i)
  expect(description, "/discover's description makes a quality claim").not.toMatch(/\bthe best\b/i)
  // The page's own truth: the groups it actually renders.
  const groups = await page.evaluate(() => [...document.querySelectorAll('h1,h2,h3')].map((h) => (h.textContent || '').trim()))
  expect(groups.length, 'read no headings off /discover').toBeGreaterThan(3)
})

// ── Reduced motion ──────────────────────────────────────────────────────────
// THE HOMEPAGE OUTLINE, AT LOAD, WITH MOTION ON — which is the default, and so
// is what almost every visitor is handed.
//
// The landmark test above walks the page before reading the tree. That is the
// right measurement for "can a reader navigate this" and the wrong one for
// "what does a screen reader get when the page opens", which is where this
// defect lived: 6 of 17 headings, outline h1 then five h3s with no h2 at any
// point. Asserting it needs a test that does NOT scroll first.
//
// reducedMotion is pinned to no-preference on purpose. Under `reduce` the
// reveals never run and every heading is present anyway, so without this the
// test would pass against the exact bug it exists to catch.
test.describe('the homepage hands over a complete outline before anything is scrolled', () => {
  for (const width of [390, 1440]) {
    test(`at ${width}px every heading is in the tree at load`, async ({ browser }) => {
      const ctx = await browser.newContext({
        viewport: { width, height: 900 }, reducedMotion: 'no-preference',
        isMobile: width <= 834, hasTouch: width <= 834,
      })
      const page = await ctx.newPage()
      await go(page, '/')
      // Long enough for the motion chunk to load and apply its opening state —
      // what is guarded here is a resting state, not a frame mid-tween.
      await page.waitForTimeout(1800)

      const outline = await page.evaluate(() => {
        const hs = [...document.querySelectorAll('h1, h2, h3, h4, h5, h6')]
        // display:none and visibility:hidden are precisely what remove a node
        // from the accessibility tree, so this measures the mechanism itself
        // rather than a proxy for it.
        const inTree = hs.filter((h) => {
          const cs = getComputedStyle(h)
          return cs.display !== 'none' && cs.visibility !== 'hidden'
        })
        const levels = inTree.map((h) => Number(h.tagName[1]))
        const skips = []
        for (let i = 1; i < levels.length; i += 1) {
          if (levels[i] > levels[i - 1] + 1) skips.push(`h${levels[i - 1]} -> h${levels[i]}`)
        }
        return {
          dom: hs.length,
          inTree: inTree.length,
          skips,
          missing: hs.filter((h) => !inTree.includes(h))
            .map((h) => `${h.tagName} "${(h.textContent || '').trim().slice(0, 28)}"`),
        }
      })

      // POSITIVE CONTROL. Both assertions below are satisfied by a page with no
      // headings at all, which is what a failed render looks like.
      expect(outline.dom, 'the homepage rendered almost no headings, so the assertions'
        + ' below would pass on an empty page').toBeGreaterThan(10)

      expect(outline.missing,
        `${outline.dom - outline.inTree} of ${outline.dom} headings are outside the`
        + ` accessibility tree at load at ${width}px. visibility:hidden removes a node`
        + ' entirely — check that useHomeMotion.js still animates `opacity` and has not'
        + ' gone back to `autoAlpha`.').toEqual([])

      expect(outline.skips,
        `the outline at ${width}px skips a level: ${outline.skips.join(', ')}`)
        .toEqual([])
      await ctx.close()
    })
  }

  // Animating opacity instead of autoAlpha keeps the content in the tree, and
  // leaves it FOCUSABLE while invisible. Measured before useHomeMotion.js grew
  // its focusin handler: 21 of 45 Tab stops at 390 and 17 at 1440 landed on an
  // invisible .htool-head or .htool-link, because focusing an element does not
  // fire a ScrollTrigger. Both halves have to hold, or the fix has traded one
  // defect for another.
  test('tabbing into an unrevealed section reveals it', async ({ browser }) => {
    const ctx = await browser.newContext({
      viewport: { width: 1440, height: 900 }, reducedMotion: 'no-preference',
    })
    const page = await ctx.newPage()
    await go(page, '/')
    await page.waitForTimeout(1800)

    const invisible = []
    let stops = 0
    for (let i = 0; i < 46; i += 1) {
      await page.keyboard.press('Tab')
      const at = await page.evaluate(() => {
        const el = document.activeElement
        if (!el || el === document.body) return null

        // WHICH ancestor is holding this at zero, not merely whether one is.
        //
        // The first version of this test multiplied opacity down the whole
        // ancestor chain and reported anything under 0.05. That reports a defect
        // this test is not about: tabbing into the workbench switches its mode,
        // which replays the `hw-panel-in` CSS entrance, and for the length of
        // that keyframe `.hw-controls` and `.hw-foot` are at opacity 0 with
        // their buttons still focusable. Measured: 20 stops, two distinct
        // causes, and `closest('[data-reveal],[data-reveal-group]')` was null
        // for both — nothing to do with the scroll reveals. A transient
        // entrance that resolves on its own is also a different severity from a
        // section that never reveals at all.
        //
        // So the culprit is identified. Only an element held down by a REVEAL
        // unit counts here: the node itself carrying [data-reveal], or a direct
        // child of a [data-reveal-group], which are exactly the two things
        // useHomeMotion.js sets opacity on.
        let n = el
        let culprit = null
        while (n && n !== document.documentElement) {
          if (parseFloat(getComputedStyle(n).opacity) < 0.05) { culprit = n; break }
          n = n.parentElement
        }
        const name = typeof el.className === 'string' && el.className
          ? el.className.trim().split(' ')[0]
          : el.tagName
        if (!culprit) return { cls: name, held: false }
        const isRevealUnit = culprit.hasAttribute('data-reveal')
          || !!(culprit.parentElement && culprit.parentElement.hasAttribute('data-reveal-group'))
        if (!isRevealUnit) return { cls: name, held: false }
        const by = typeof culprit.className === 'string' && culprit.className
          ? culprit.className.trim().split(' ')[0]
          : culprit.tagName
        return { cls: name, held: true, by }
      })
      if (!at) continue
      stops += 1
      if (at.held) invisible.push(`${at.cls}, held at opacity 0 by .${at.by}`)
    }

    expect(stops, 'the Tab sweep reached almost nothing, so the assertion below is vacuous')
      .toBeGreaterThan(15)
    expect([...new Set(invisible)],
      `${invisible.length} keyboard stop(s) landed inside a section the scroll reveal has`
      + ' not opened. The reveals animate opacity, so an unrevealed section is focusable —'
      + ' useHomeMotion.js reveals on focusin to cover that, and this fails if that'
      + ' handler goes.')
      .toEqual([])
    await ctx.close()
  })
})

test('nothing on the marketing set is left invisible under reduced motion', async ({ browser }) => {
  // A reveal that animates opacity 0 -> 1 and is suppressed by a
  // prefers-reduced-motion block without its resting state being corrected
  // leaves the content painted at opacity 0 forever. It is invisible and it is
  // still in the accessibility tree, which is the worst of both.
  const ctx = await browser.newContext({
    viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce',
  })
  const page = await ctx.newPage()
  const bad = []
  let examined = 0
  for (const route of ['/', '/plans', '/discover', '/discover/palettes', '/learn', '/community']) {
    await go(page, route)
    await page.waitForTimeout(300)
    // SCROLL THE WHOLE PAGE FIRST. The first version of this test did not, and
    // it reported 14 "invisible" elements that were simply below the fold with
    // their scroll reveal not yet fired — /learn's seven guide cards start at
    // y=1048 in a 900px viewport. That is the reveal working, not failing.
    // What this test is actually for is the reveal that never RESOLVES: an
    // opacity 0 -> 1 animation suppressed by a prefers-reduced-motion block
    // without its resting state corrected leaves content painted at opacity 0
    // permanently — invisible, and still in the accessibility tree.
    await page.evaluate(async () => {
      const step = Math.round(window.innerHeight * 0.8)
      for (let y = 0; y <= document.body.scrollHeight; y += step) {
        window.scrollTo(0, y)
        await new Promise((r) => requestAnimationFrame(() => setTimeout(r, 60)))
      }
      window.scrollTo(0, 0)
      await new Promise((r) => setTimeout(r, 120))
    })
    await page.waitForTimeout(200)
    const r = await page.evaluate(() => {
      const out = []
      let n = 0
      for (const el of document.querySelectorAll('main *, .home *')) {
        const cs = getComputedStyle(el)
        if (cs.display === 'none' || cs.visibility === 'hidden') continue
        const b = el.getBoundingClientRect()
        if (b.width === 0 || b.height === 0) continue
        n += 1
        if (parseFloat(cs.opacity) !== 0) continue
        if ((el.textContent || '').trim().length < 3) continue
        if (el.getAttribute('aria-hidden') === 'true' || el.closest('[aria-hidden="true"]')) continue
        if (cs.pointerEvents === 'none') continue
        out.push(el.tagName.toLowerCase()
          + (typeof el.className === 'string' && el.className ? '.' + el.className.trim().split(/\s+/).slice(0, 2).join('.') : '')
          + ` "${(el.textContent || '').trim().slice(0, 30)}"`)
      }
      return { out: out.slice(0, 8), n }
    })
    examined += r.n
    for (const s of r.out) bad.push(`  ${route}: ${s} is painted at opacity 0`)
  }
  await ctx.close()
  expect(examined, 'the reduced-motion probe looked at nothing').toBeGreaterThan(400)
  expect(bad.join('\n'), 'content left invisible under prefers-reduced-motion').toBe('')
})
