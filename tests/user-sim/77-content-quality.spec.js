// The 2026-09-11 quality pass over the CONTENT and BROWSING surfaces — /learn
// and its seven guides, /discover and its four libraries, /community — rendered
// rather than read. One test per fix, each seen to FAIL with its fix reverted
// at the call site before it was trusted (tally in the PR).
//
// ── Why these assertions are geometric rather than textual ─────────────────
//
// Not one of the defects below is a wrong word. They are a token that means two
// different numbers, a max-width that was never reset, a measure that gets
// LONGER as the type gets smaller, a link box one pixel under the criterion,
// and an empty state that told a screen reader nothing. None of that is visible
// to a DOM snapshot or a string match — it is only visible if something renders
// the page and measures it, which is what every test here does.
//
// ── The rule each check encodes ────────────────────────────────────────────
//
//   · Bringhurst puts a satisfactory single-column line at 45-75 characters,
//     and learn-article.css's own header comment already cites him. WCAG 1.4.8
//     caps at 80. The article body was 67 and right; the two SMALLER blocks set
//     in the same fixed-pixel column were 76 and 79, because a px column gives
//     smaller type MORE characters per line.
//   · WCAG 2.2 SC 2.5.8 Target Size (Minimum) is 24x24, with the Inline
//     exception implemented exactly as 58-target-size-24 implements it: a link
//     whose parent holds meaningfully more text than the link itself. A
//     Sources <li> holds nothing but its link, so it is not exempt.
//   · SC 4.1.3 Status Messages: a grid that empties without announcing is
//     silent to a screen reader. Three of the four Discover libraries already
//     announced; the fourth did not.
//   · components/library/LibraryEmpty.jsx states the dead-end rule in its own
//     header comment. This suite checks the Prompt Library finally obeys it.
import { test, expect } from './base.js'
import { expectRendered, go, watch } from './helpers.js'
import { LEARN_ARTICLES } from '../../src/data/learnIndex.js'

const PERSONA = 'someone reading a reference guide on a laptop, and on a phone'

// Characters per line, measured on the element's OWN computed font rather than
// assumed: the width of the box divided by the mean advance of the lowercase
// alphabet in that exact face, weight and size. A cap expressed in px would be
// a different number of characters in every one of these blocks, which is the
// whole defect being guarded.
const CPL = (sel) => {
  const el = document.querySelector(sel)
  if (!el) return null
  const r = el.getBoundingClientRect()
  if (!r.width) return null
  const cs = getComputedStyle(el)
  const cv = document.createElement('canvas').getContext('2d')
  cv.font = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`
  const advance = cv.measureText('abcdefghijklmnopqrstuvwxyz ').width / 27
  return { cpl: Math.round(r.width / advance), width: Math.round(r.width), fontSize: cs.fontSize }
}

// 58-target-size-24's Inline exception, reproduced so the two suites cannot
// disagree about what counts as a failure.
const UNDER_24 = () => {
  const shown = (el) => {
    const cs = getComputedStyle(el)
    if (cs.display === 'none' || cs.visibility === 'hidden' || parseFloat(cs.opacity) === 0) return false
    return el.getClientRects().length > 0
  }
  // Inline-level display is required, not just "the parent holds more text".
  // The looser form excused 23 block-level `.htool-head` measurements on the
  // homepage for a day; 58-target-size-24 carries the full argument.
  const inlineInSentence = (el) => {
    if (el.tagName !== 'A') return false
    if (!getComputedStyle(el).display.startsWith('inline')) return false
    const p = el.parentElement
    if (!p) return false
    return (p.innerText || '').trim().length > (el.innerText || '').trim().length + 3
  }
  const out = { examined: 0, tooSmall: [] }
  for (const el of document.querySelectorAll('a[href], button, [role=button], [role=tab], select, summary')) {
    if (!shown(el) || el.disabled) continue
    if (getComputedStyle(el).pointerEvents === 'none') continue
    const r = el.getBoundingClientRect()
    if (r.width < 1 || r.height < 1) continue
    out.examined++
    if (r.width >= 24 && r.height >= 24) continue
    if (inlineInSentence(el)) continue
    const txt = (el.innerText || el.getAttribute('aria-label') || '').trim().replace(/\s+/g, ' ').slice(0, 34)
    out.tooSmall.push(`${el.tagName.toLowerCase()} "${txt}" = ${r.width.toFixed(1)}x${r.height.toFixed(1)}`)
  }
  return out
}

const GUIDE_ROUTES = LEARN_ARTICLES.map((a) => `/learn/${a.slug}`)

test.describe('the Learn article shell', () => {
  // ── The defect this replaces ──
  // learn-article.css has always carried the comment "so the crumb, the h1 and
  // the first paragraph share one left edge". They did not. Measured at 1440
  // before the fix: crumb text 667.2, h1 693.6, first paragraph 561.6 — three
  // edges, and the h1 was indented 132px PAST the body it introduces while
  // being squeezed into a 317px column against the prose's 581px.
  //
  // TWO separate causes, and this test kills both:
  //   · .lart-head kept max-width:56ch into the >=1080 layout, clamping the
  //     845px block back to 581px  -> moves the h1;
  //   · --lart-measure was an UNREGISTERED custom property holding `56ch`, so
  //     it was substituted as token text and re-resolved against each user's
  //     own font: 580.72px on .lart-prose (17px Manrope) but 369.6px on
  //     .lart-crumb (11px JetBrains Mono)  -> moves the crumb.
  test('the crumb, the h1 and the first paragraph share one left edge', async ({ page }) => {
    watch(page, PERSONA)
    for (const width of [1097, 1136, 1440, 1920]) {
      await page.setViewportSize({ width, height: 900 })
      await go(page, '/learn/colour-contrast')
      await expectRendered(page)
      const edges = await page.evaluate(() => {
        const left = (sel) => {
          const el = document.querySelector(sel)
          return el ? +el.getBoundingClientRect().left.toFixed(1) : null
        }
        return {
          crumb: left('.lart-crumb a'),
          h1: left('.lart-head h1'),
          prose: left('.lart-prose p'),
          h1Width: Math.round(document.querySelector('.lart-head h1').getBoundingClientRect().width),
          proseWidth: Math.round(document.querySelector('.lart-prose').getBoundingClientRect().width),
        }
      })
      // POSITIVE CONTROL: all three actually rendered, and the rail layout is
      // really in force. "They share an edge" is trivially true of three nulls.
      expect(edges.crumb, `crumb link missing at ${width}`).not.toBeNull()
      expect(edges.h1, `h1 missing at ${width}`).not.toBeNull()
      expect(edges.prose, `first paragraph missing at ${width}`).not.toBeNull()
      expect(edges.proseWidth, `prose column at ${width}`).toBeGreaterThan(400)

      expect(edges.h1, `h1 vs prose left edge at ${width}`).toBeCloseTo(edges.prose, 0)
      expect(edges.crumb, `crumb vs prose left edge at ${width}`).toBeCloseTo(edges.prose, 0)
      // And the title column is the full measure, not a padded remnant of it.
      expect(edges.h1Width, `h1 column at ${width}`).toBeGreaterThan(edges.proseWidth - 2)
    }
  })

  // ── The defect this replaces ──
  // The prose column is a fixed 581px, so the SMALLER the type set inside it,
  // the more characters land on a line. Measured at 768 and up before the fix:
  // body 17px = 67 characters (right), .lart-next-lede 15px = 76, .lart-aside
  // 14.5px = 79 — and the aside is also the page's lowest-contrast text (--t3).
  test('no block in an article runs past 75 characters a line', async ({ page }) => {
    watch(page, PERSONA)
    for (const width of [768, 1097, 1440, 1920]) {
      await page.setViewportSize({ width, height: 900 })
      await go(page, '/learn/colour-contrast')
      await expectRendered(page)
      const measured = await page.evaluate((sels) => {
        const out = {}
        for (const s of sels) {
          const el = document.querySelector(s)
          if (!el) { out[s] = null; continue }
          const r = el.getBoundingClientRect()
          if (!r.width) { out[s] = null; continue }
          const cs = getComputedStyle(el)
          const cv = document.createElement('canvas').getContext('2d')
          cv.font = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`
          out[s] = Math.round(r.width / (cv.measureText('abcdefghijklmnopqrstuvwxyz ').width / 27))
        }
        return out
      }, ['.lart-prose p', '.lart-aside', '.lart-next-lede'])

      for (const [sel, cpl] of Object.entries(measured)) {
        // POSITIVE CONTROL: a block that did not render measures nothing, and a
        // "no line is too long" check passes trivially on a page with no text.
        expect(cpl, `${sel} did not render at ${width}`).not.toBeNull()
        expect(cpl, `${sel} at ${width} is too narrow to be real`).toBeGreaterThan(30)
        expect(cpl, `${sel} measures ${cpl} characters a line at ${width}`).toBeLessThanOrEqual(75)
      }
    }
  })

  // ── The defect this replaces ──
  // Every guide's Sources list is one link per <li>, so SC 2.5.8's Inline
  // exception does not apply — the li holds nothing but the link. Measured
  // 19.0px tall at 320 through 1440 on all seven guides, plus .lart-spec-cite's
  // source link at 19.7px. These are the links that make the guides checkable.
  for (const route of GUIDE_ROUTES) {
    test(`${route} keeps every citation link at 24px or more`, async ({ page }) => {
      watch(page, PERSONA)
      for (const width of [320, 768, 1440]) {
        await page.setViewportSize({ width, height: 900 })
        await go(page, route)
        await expectRendered(page)
        const res = await page.evaluate(UNDER_24)
        // POSITIVE CONTROL: the guide really rendered its links. A page that
        // failed to load examines nothing and passes the assertion below.
        expect(res.examined, `${route} @${width} examined no controls`).toBeGreaterThan(20)
        expect(res.tooSmall, `${route} @${width}`).toEqual([])
      }
    })
  }

  // The Sources section is the thing being sized, so prove it is actually there
  // on every guide — otherwise the loop above is checking seven pages that
  // happen to have no citations.
  test('every guide renders a Sources list to size', async ({ page }) => {
    watch(page, PERSONA)
    for (const route of GUIDE_ROUTES) {
      await go(page, route)
      await expectRendered(page)
      const n = await page.locator('.lart-sources li a').count()
      expect(n, `${route} rendered no source links`).toBeGreaterThan(0)
    }
  })
})

test.describe('the Prompt Library empty state', () => {
  // ── The defect this replaces ──
  // components/library/LibraryEmpty.jsx says it in its own header comment: "an
  // empty grid whose only escape is for the user to work out which of three
  // filters they set is the dead end murphys-law.md exists to forbid." The
  // Palette, Gradient, Font and Curated Resources galleries all adopted it. The
  // Prompt Library rendered a bare <p> with no control and no role, so the grid
  // emptying was announced to NOBODY — measured: its role="status" region was
  // present and rendered the empty string — and there was no way back out.
  test('a search that matches nothing announces itself and offers a way out', async ({ page }) => {
    watch(page, PERSONA)
    await go(page, '/discover/prompts')
    await expectRendered(page)

    const field = page.getByLabel('Search community prompts')
    // POSITIVE CONTROL: there are prompts to lose before we filter them away.
    const before = await page.locator('.pl-gallery .pl-card, .pl-gallery article').count()
    expect(before, 'the library rendered no cards to filter').toBeGreaterThan(3)

    await field.fill('zzzzqqqnothing')
    await expect(page.locator('.lbry-empty')).toBeVisible()

    // SC 4.1.3: the emptying is carried by a live region that actually holds
    // the sentence, not an empty one that exists and says nothing.
    const announced = await page.evaluate(() => {
      const regions = [...document.querySelectorAll('[role="status"], [aria-live]')]
      return regions.map((r) => r.textContent.trim()).filter(Boolean)
    })
    expect(announced.join(' | '), 'nothing was announced when the grid emptied').toContain('No prompts match your search')

    // And the way out is a real, operable control INSIDE the empty state.
    const clear = page.locator('.lbry-empty button')
    await expect(clear).toBeVisible()
    const box = await clear.boundingBox()
    expect(box.height, 'the way out is under 24px').toBeGreaterThanOrEqual(24)

    await clear.click()
    await expect(field).toHaveValue('')
    const after = await page.locator('.pl-gallery .pl-card, .pl-gallery article').count()
    expect(after, 'clearing the filters did not bring the prompts back').toBe(before)
  })

  // ── The defect this replaces ──
  // The locked-Pro group was labelled by an sr-only h3 directly under the page
  // h1, with the closing CTA's h2 after it — so anyone navigating by heading
  // level read h1 -> h3 -> h2. The group is a top-level region of the page,
  // the same rank as the CTA it precedes.
  test('the heading levels never skip a step', async ({ page }) => {
    watch(page, PERSONA)
    for (const route of ['/discover/prompts', '/discover/palettes', '/discover/gradients', '/discover/resources', '/community', '/learn']) {
      await go(page, route)
      await expectRendered(page)
      const levels = await page.evaluate(() => [...document.querySelectorAll('main h1, main h2, main h3, main h4, .sec h1, .sec h2, .sec h3, .sec h4')]
        .filter((h) => h.getClientRects().length > 0 || h.className.includes('sr-only'))
        .map((h) => ({ level: +h.tagName[1], text: h.textContent.trim().slice(0, 46) })))
      // POSITIVE CONTROL: the page has a heading outline at all.
      expect(levels.length, `${route} rendered no headings`).toBeGreaterThan(1)
      expect(levels[0].level, `${route} does not start at h1`).toBe(1)
      for (let i = 1; i < levels.length; i++) {
        expect(
          levels[i].level,
          `${route} jumps h${levels[i - 1].level} "${levels[i - 1].text}" -> h${levels[i].level} "${levels[i].text}"`,
        ).toBeLessThanOrEqual(levels[i - 1].level + 1)
      }
    }
  })
})

test.describe('Curated Resources', () => {
  // ── The defect this replaces ──
  // .cur-lead-title holds nothing but its link, so SC 2.5.8's Inline exception
  // does not apply (the sibling .cur-row-title's does — it also carries a
  // PriceTag). At the 16px the lead title drops to below 640px, seven of those
  // links measured 23.0px: one pixel under, at 320 and 390 only.
  test('the lead resource links clear 24px on a phone', async ({ page }) => {
    watch(page, PERSONA)
    for (const width of [320, 390, 768]) {
      await page.setViewportSize({ width, height: 900 })
      await go(page, '/discover/resources')
      await expectRendered(page)
      const res = await page.evaluate(UNDER_24)
      // POSITIVE CONTROL: the lead cards rendered. Zero lead links means zero
      // failures, and the assertion below would pass on an empty page.
      const leads = await page.locator('.cur-lead-title .cur-link').count()
      expect(leads, `no lead resources rendered at ${width}`).toBeGreaterThan(3)
      expect(res.tooSmall, `/discover/resources @${width}`).toEqual([])
    }
  })
})

test.describe('route metadata', () => {
  // ── The defect this replaces ──
  // App.jsx looked PAGE_TITLES up by the raw pathname while the other two
  // readers of that same value in the same effect — canonicalUrl() and
  // isUnknownRoute() — both strip a trailing slash. So "/learn/" missed the map
  // and fell through to the homepage's title AND description, on every route,
  // while the canonical tag correctly named the unslashed URL. Both spellings
  // are served 200 (vercel.json sets no trailingSlash), so a real visitor's tab,
  // bookmark and any JS-running crawler saw "UI L4B | Design Toolkit".
  test('a trailing slash keeps the route its own title and description', async ({ page }) => {
    watch(page, PERSONA)
    const HOME_DEFAULT = 'UI L4B | Design Toolkit'
    for (const route of ['/learn', '/discover', '/discover/palettes', '/community', '/learn/colour-contrast']) {
      await go(page, route)
      await expectRendered(page)
      const bare = {
        title: await page.title(),
        desc: await page.evaluate(() => document.querySelector('meta[name="description"]')?.content || ''),
      }
      // POSITIVE CONTROL: the unslashed URL really does have its own metadata,
      // so "the two agree" cannot be satisfied by both being the default.
      expect(bare.title, `${route} has no title of its own`).not.toBe(HOME_DEFAULT)
      expect(bare.desc.length, `${route} has no description of its own`).toBeGreaterThan(20)

      await go(page, `${route}/`)
      await expectRendered(page)
      const slashed = {
        title: await page.title(),
        desc: await page.evaluate(() => document.querySelector('meta[name="description"]')?.content || ''),
      }
      expect(slashed.title, `${route}/ lost its title`).toBe(bare.title)
      expect(slashed.desc, `${route}/ lost its description`).toBe(bare.desc)
    }
  })
})
// A NAMED REGION IS NOT THE SAME TEST AS "NO UNNAMED REGION", and the gap
// between those two sentences is where this defect lived.
//
// 88-marketing-breakpoints walks the accessibility tree of every marketing
// route and fails an unnamed region — but a page with NO region at all
// satisfies that, vacuously. /community and /discover/prompts were both in that
// state: the cards are what each page is for, and each grid was a bare <div>,
// so a reader navigating by landmark found the header and the footer and
// nothing naming the twelve items between them. Their three sibling libraries
// (Palette, Gradient, Curated Resources) all render DiscoverResultHead, which
// is a labelled section plus a live count; these two had neither.
//
// The count matters as much as the name: the category filters can take the grid
// from twelve to zero, and until now that changed the screen and said nothing.
//
// This asserts the region EXISTS, is named, and announces — the half the
// landmark sweep structurally cannot ask for.
test.describe('the two library grids name themselves and announce their size', () => {
  const CASES = [
    { route: '/discover/prompts', noun: 'prompt', cards: '.pl-gallery > *' },
    { route: '/community', noun: 'design', cards: '.ch-grid > *' },
  ]
  for (const { route, noun, cards } of CASES) {
    test(`${route} exposes a named results region with a live count`, async ({ page }) => {
      watch(page, 'someone browsing by landmark with a screen reader')
      await go(page, route)
      await page.waitForSelector(cards, { timeout: 15000 })

      // POSITIVE CONTROL: a route that rendered nothing satisfies every
      // assertion about what it announces.
      const rendered = await page.locator(cards).count()
      expect(rendered, `${route} rendered no cards, so the assertions below are vacuous`)
        .toBeGreaterThan(0)

      // THE REGION HOLDING THE CARDS, not any region on the page — and that
      // distinction is the whole assertion.
      //
      // This first read `regions.length > 0` off the accessibility tree, and
      // two of four mutations survived it: both pages carry a second named
      // region further down (the closing "Can't find what you're looking for?"
      // CTA), so stripping the label off the results section still left one.
      // The test passed while the defect was back. Caught by mutation, which is
      // the only thing that could have caught it.
      //
      // Asked of the cards' own ancestor instead, and by LABEL rather than by
      // name text, so it stays true when the wording changes.
      const holder = await page.evaluate((sel) => {
        const card = document.querySelector(sel)
        const section = card && card.closest('section')
        if (!section) return { framed: false, label: '' }
        const id = section.getAttribute('aria-labelledby')
        const label = id
          ? ((document.getElementById(id) || {}).textContent || '').trim()
          : (section.getAttribute('aria-label') || '').trim()
        return { framed: true, label }
      }, cards)

      expect(holder.framed, `${route}: the cards sit in no <section> at all. The grid is `
        + 'the thing this page is for and it has to be reachable from the landmark list '
        + '— see the note above the results section in the page component.').toBe(true)
      expect(holder.label, `${route}: the section holding the cards has no accessible `
        + 'name, so it is not a region — an unnamed section is `generic` in the tree and '
        + 'never appears on the landmark list.').not.toBe('')

      // And it really does surface as a named region, which is the fact a
      // screen reader acts on. Chrome's own tree, not the markup.
      const cdp = await page.context().newCDPSession(page)
      await cdp.send('Accessibility.enable')
      const { nodes } = await cdp.send('Accessibility.getFullAXTree')
      await cdp.detach().catch(() => {})
      const regions = nodes
        .filter((n) => n.role?.value === 'region')
        .map((n) => (n.name?.value || '').trim())
        .filter(Boolean)

      expect(regions, `${route}: "${holder.label}" labels the results section in the `
        + 'markup but is not on the landmark list')
        .toContain(holder.label)

      // The count is announced politely, and it is the REAL count.
      const live = page.locator('[aria-live="polite"]').filter({ hasText: new RegExp(`\\d+ ${noun}s?$`) })
      await expect(live, `${route} announces no ${noun} count. Filtering can empty this `
        + 'grid, and an empty grid that says nothing is the state this region exists to '
        + 'prevent.').toHaveCount(1)
      const announced = Number(((await live.first().textContent()) || '').trim().split(' ')[0])
      expect(Number.isFinite(announced), 'the announced count is a number').toBe(true)
      expect(announced, 'the announced count is not zero while cards are on screen')
        .toBeGreaterThan(0)
    })
  }
})
