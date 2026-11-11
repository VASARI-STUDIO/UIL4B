// The /learn index and every guide on a touch phone and a touch tablet, in both
// themes: nothing wider than the screen, nothing clipped, nothing under 12px,
// no card inside a card, and short inline code that stays in one piece.
//
// Viewport-only screenshots land in .claude/scratch/phlearn1/ for a person to
// look at; the assertions below are what fails.
import { test, expect } from './base.js'
import { go, watch } from './helpers.js'
import { LEARN_ARTICLES } from '../../src/data/learnIndex.js'

const VIEWPORTS = [{ width: 390, height: 844 }, { width: 768, height: 1024 }]
const THEMES = ['light', 'dark']
// The seven guides plus /learn/principles, which sits under /learn but is not
// in the registry.
const GUIDES = [...LEARN_ARTICLES.map((a) => a.slug), 'principles']
const SHOTS = '.claude/scratch/phlearn1'
// Inline code up to this length is one token (src/hooks/useShortCode.js).
const SHORT_CODE = 20

/** Put the page in a theme the way the app does: the attribute on <html>. */
async function setTheme(page, theme) {
  await page.evaluate((t) => document.documentElement.setAttribute('data-theme', t), theme)
  await page.waitForTimeout(250)
}

/** Everything the guide assertions read, taken in one pass in the page. */
function inspectArticle() {
  const root = document.querySelector('.lart, .prn')
  const out = { rootFound: !!root, overflow: document.documentElement.scrollWidth - innerWidth, small: [], nested: [], brokenCode: [], indented: [], tables: [] }
  if (!root) return out

  // Text under 12px: any visible element that owns a text node.
  for (const el of root.querySelectorAll('*')) {
    if (![...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())) continue
    const cs = getComputedStyle(el)
    if (cs.display === 'none' || cs.visibility === 'hidden') continue
    const size = parseFloat(cs.fontSize)
    if (size < 12) out.small.push(`${el.tagName.toLowerCase()}.${el.className} ${size}px "${el.textContent.trim().slice(0, 24)}"`)
  }

  // A card is a block box with a visible border on all four sides, rounded, and
  // big enough to hold something. Swatches and chips are smaller than that.
  // .prn-cx-sample is exempt: it is the measured button whose own border IS the
  // 3:1 boundary that figure demonstrates.
  const isCard = (el) => {
    if (el.matches('.prn-cx-sample')) return false
    const cs = getComputedStyle(el)
    if (cs.display === 'inline') return false
    const r = el.getBoundingClientRect()
    const edges = ['Top', 'Right', 'Bottom', 'Left'].every((s) => {
      const colour = cs[`border${s}Color`]
      return parseFloat(cs[`border${s}Width`]) > 0 && colour !== 'transparent' && !/,\s*0\)$/.test(colour)
    })
    return edges && parseFloat(cs.borderTopLeftRadius) > 0 && r.width >= 80 && r.height >= 40
  }
  for (const fig of root.querySelectorAll('figure')) {
    for (const el of [fig, ...fig.querySelectorAll('*')]) {
      if (!isCard(el)) continue
      for (let a = el.parentElement; a && a !== fig.parentElement; a = a.parentElement) {
        if (isCard(a)) { out.nested.push(`${el.tagName.toLowerCase()}.${el.className} inside ${a.tagName.toLowerCase()}.${a.className}`); break }
      }
    }
  }

  // Short inline code on more than one line has been broken mid-token.
  for (const el of root.querySelectorAll('code')) {
    if (el.closest('pre')) continue
    const text = el.textContent.trim()
    if (text.length <= 20 && el.getClientRects().length > 1) out.brokenCode.push(text)
  }

  // A figure's box fills its figure: `.lart-prose ol` gives every list a left
  // margin, and the type ladder is a list.
  for (const box of root.querySelectorAll('figure > .lart-ladder')) {
    const gap = box.getBoundingClientRect().left - box.parentElement.getBoundingClientRect().left
    if (Math.abs(gap) > 1) out.indented.push(`${box.className} sits ${Math.round(gap)}px in from its figure`)
  }

  for (const scroller of root.querySelectorAll('.lart-table-scroll')) {
    const table = scroller.querySelector('table')
    const sr = scroller.getBoundingClientRect()
    const cs = getComputedStyle(scroller)
    const stacked = getComputedStyle(table).display === 'block'
    const probe = document.createElement('span')
    probe.style.cssText = 'position:absolute;visibility:hidden;width:7ch'
    const firstTh = table.querySelector('tbody th')
    firstTh.appendChild(probe)
    const sevenCh = probe.getBoundingClientRect().width
    probe.remove()
    // A stacked table keeps its thead for screen readers, clipped to 1px and
    // placed out of the way, so its cells are not painted and are not measured.
    const cells = [...table.querySelectorAll(stacked ? 'tbody th, tbody td' : 'th, td')].filter((c) => c.getClientRects().length)
    out.tables.push({
      label: scroller.getAttribute('aria-label') || scroller.getAttribute('aria-labelledby') || 'table',
      stack: table.classList.contains('lart-table--stack'),
      stacked,
      overflowX: cs.overflowX,
      scrollW: scroller.scrollWidth,
      clientW: scroller.clientWidth,
      inViewport: sr.left >= -0.5 && sr.right <= innerWidth + 0.5,
      mask: cs.maskImage,
      firstColW: firstTh.getBoundingClientRect().width,
      sevenCh,
      // Cells reach no further than the scroller's scrollable width, so none is
      // painted past a clip.
      outside: cells.filter((c) => {
        const r = c.getBoundingClientRect()
        // scrollWidth starts inside the scroller's border, so take clientLeft off.
        return r.right - sr.left - scroller.clientLeft + scroller.scrollLeft > scroller.scrollWidth + 1 || r.left < sr.left - 1
      }).length,
      // A stacked row keeps its heading left of its values, all inside the row.
      stackBroken: stacked ? [...table.querySelectorAll('tbody tr')].filter((tr) => {
        const rr = tr.getBoundingClientRect()
        const th = tr.querySelector('th').getBoundingClientRect()
        return [...tr.querySelectorAll('td')].some((td) => {
          const r = td.getBoundingClientRect()
          return r.left < th.right - 1 || r.right > rr.right + 1 || r.left < rr.left - 1
        })
      }).length : 0,
    })
  }
  return out
}

for (const vp of VIEWPORTS) {
  for (const theme of THEMES) {
    test.describe(`${vp.width}px touch, ${theme}`, () => {
      test.use({ viewport: vp, hasTouch: true, isMobile: true })

      test('the /learn index keeps one line of 44px topic targets, on the 12px gutter', async ({ page }) => {
        watch(page, `reader opening the Learn index on a ${vp.width}px touch screen`)
        await go(page, '/learn')
        await setTheme(page, theme)
        const m = await page.evaluate(() => {
          const links = [...document.querySelectorAll('.lidx-topics a')].filter((a) => a.getClientRects().length).map((a) => {
            const r = a.getBoundingClientRect()
            return { top: r.top, bottom: r.bottom, left: r.left, right: r.right, height: r.height, lines: a.getClientRects().length, wrap: getComputedStyle(a).whiteSpace }
          })
          const search = document.querySelector('.lidx-tools .lbry-search').getBoundingClientRect()
          const wrap = getComputedStyle(document.querySelector('.srf-wrap'))
          return {
            links, searchBottom: search.bottom, gutterL: parseFloat(wrap.paddingLeft), gutterR: parseFloat(wrap.paddingRight),
            overflow: document.documentElement.scrollWidth - innerWidth, vw: innerWidth,
            small: [...document.querySelectorAll('.srf *')].filter((el) => [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim()) && getComputedStyle(el).display !== 'none' && parseFloat(getComputedStyle(el).fontSize) < 12).length,
          }
        })
        expect(m.links.length, 'the topic links are missing').toBeGreaterThanOrEqual(4)
        // MUTATION: put `flex-wrap: wrap` back on `.srf .lidx-topics` and drop
        // `white-space: nowrap` from its links (surface.css): at 390 the last
        // link drops to a second row and this fails on the differing tops.
        for (const l of m.links) {
          expect(Math.abs(l.top - m.links[0].top), 'the topic links are not on one line').toBeLessThanOrEqual(1)
          expect(l.lines, 'a topic label wraps').toBe(1)
          // MUTATION: set `min-height: 32px` on `.srf .lidx-topics a`.
          expect(l.height, 'a topic target is under 44px').toBeGreaterThanOrEqual(44)
          expect(l.left, 'a topic link is clipped on the left').toBeGreaterThanOrEqual(11)
          expect(l.right, 'a topic link runs to the screen edge').toBeLessThanOrEqual(m.vw - 11)
        }
        // MUTATION: restore `flex-direction: row` on `.srf .lidx-tools` below
        // 1025px: at 768 the topics sit beside the search and start above its bottom.
        expect(m.links[0].top, 'the topics are not on their own row under the search').toBeGreaterThanOrEqual(m.searchBottom)
        // MUTATION: delete the `.srf.srf--learn .srf-wrap` gutter rule: the
        // shell's 16px comes back.
        expect(m.gutterL).toBe(12)
        expect(m.gutterR).toBe(12)
        expect(m.overflow, 'the page scrolls sideways').toBeLessThanOrEqual(0)
        expect(m.small, 'text under 12px on the index').toBe(0)
        await page.screenshot({ path: `${SHOTS}/learn-index-${vp.width}-${theme}.png` })
      })

      for (const slug of GUIDES) {
        test(`/learn/${slug} fits, is readable and has no card in a card`, async ({ page }) => {
          watch(page, `reader on /learn/${slug}, ${vp.width}px touch`)
          await go(page, `/learn/${slug}`)
          // The measured tables render after fonts are ready.
          await page.locator('.lart-table-scroll').first().waitFor({ timeout: 8000 }).catch(() => {})
          await setTheme(page, theme)
          const m = await page.evaluate(inspectArticle)
          expect(m.rootFound, 'the article root is missing').toBe(true)
          expect(m.overflow, 'the page scrolls sideways').toBeLessThanOrEqual(0)

          // MUTATION: put any of the 11.5px, 11px, 10.5px or 9.6px sizes back
          // (.lart-hex, .lart-face-role, .lart-ladder-nums, a <sup>, or the
          // code in a caption) and the offender is named here.
          expect(m.small, `text under 12px: ${m.small.slice(0, 4).join(' | ')}`).toEqual([])

          // MUTATION: delete the `border:0` / `background:none` reset on
          // `.lart .lart-formula code` (type-scales), or the `border: 0` on
          // `.prn-th-panel` (principles): a bordered box appears inside the
          // bordered one.
          expect(m.nested, `a card inside a card: ${m.nested.join(' | ')}`).toEqual([])

          // MUTATION: delete the `.lart code[data-short]` rule or the
          // useShortCode call in LearnArticle.jsx: `--accent-strong` breaks
          // after the "--" at 390.
          expect(m.brokenCode, `short inline code broke across lines: ${m.brokenCode.join(' | ')}`).toEqual([])

          // MUTATION: delete the `.lart .lart-prose .lart-ladder{margin:0}` rule
          // (learn-article.css): the prose list margin indents the ladder 19px.
          expect(m.indented, `a figure box is indented: ${m.indented.join(' | ')}`).toEqual([])

          for (const t of m.tables) {
            const who = `${slug} table "${t.label.slice(0, 40)}"`
            // MUTATION: set `overflow-x: hidden` on `.lart-table-scroll`: the
            // wide tables are clipped with no way to reach the rest.
            expect(['auto', 'scroll'], `${who} cannot scroll sideways`).toContain(t.overflowX)
            expect(t.inViewport, `${who} sticks out of the screen`).toBe(true)
            expect(t.outside, `${who} has cells outside its scroller`).toBe(0)
            // MUTATION: drop `min-width: 7ch` from `.lart-table tbody th`.
            if (!t.stacked) expect(t.firstColW, `${who} first column is under 7ch`).toBeGreaterThanOrEqual(t.sevenCh - 0.5)
            if (t.scrollW > t.clientW + 1) {
              // MUTATION: remove the lart-scroll-cue animation: a table that
              // overflows shows no edge fade.
              expect(t.mask, `${who} overflows with no edge fade`).not.toBe('none')
            }
            if (t.stacked) {
              expect(t.scrollW, `${who} is stacked but still wider than its box`).toBeLessThanOrEqual(t.clientW + 1)
              expect(t.stackBroken, `${who} has a stacked row whose values leave the row`).toBe(0)
            }
          }

          // The contrast and metrics tables are stacked rows under 480px.
          if (vp.width < 480 && (slug === 'colour-contrast' || slug === 'typeface-metrics')) {
            const stackTables = m.tables.filter((t) => t.stack)
            expect(stackTables.length, `${slug} has no stackable table`).toBeGreaterThan(0)
            // MUTATION: delete the `@media(max-width:479px)` stacked-rows block
            // in learn-article.css: the tables go back to scrolling.
            for (const t of stackTables) expect(t.stacked, `${slug} table is not stacked at ${vp.width}px`).toBe(true)
          }
          await page.screenshot({ path: `${SHOTS}/${slug}-${vp.width}-${theme}.png` })
        })
      }
    })
  }
}
