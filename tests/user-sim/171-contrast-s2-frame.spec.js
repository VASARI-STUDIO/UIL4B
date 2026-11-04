// /create/contrast, slice 2 part 1: the first view, the fixed frame, the legend
// on every view, the ratio strip on narrow screens, and two-colour painting.
//
// Interface is the first view; Specimen is the last. Article and Landing page
// sit between them, and every test below loops over all four.
//
//   N1  the first view is Interface, with no click
//   N3  the page is exactly as tall for every view and every verdict (1440, 390)
//   N5  every painted fill and stroke in a view is the text colour or the background
//   N6  no view prints "70% text", "45% text" or "20% text"
//   N7  switching views starts no keyframe animation
//   N8  at 390x844 the fields, the ratio and the top 300px of the preview are on screen
//   N9  the legend is there for Specimen too, and Specimen has a part of each test
//   N10 nothing in a view is clipped by the fixed frame (1440, 768, 390, 320)
//
// The four verdict pairs sit on white and were checked with the WCAG formula:
//   #000000 21.00:1 AAA   #767676 4.54:1 AA   #949494 3.03:1 large only   #AAAAAA 2.32:1 fails
//
// MUTATIONS, one per test, each watched going red:
//   N1  useState('interface') back to 'specimen' in ContrastChecker.jsx
//   N3  render the legend only for non-Specimen views, or drop the fixes min-height
//   N5  give any rule in Interface.css a literal #888 border or fill
//   N6  print "70% text" anywhere in a view's data file
//   N7  put `animation: pvs-in 150ms` back on `.cc .cc-pv`
//   N8  give `.cc-ratio--strip` `order: 3` in contrast.css (the ratio drops under the preview)
//   N9  hide the legend when the view is Specimen
//   N10 add 80px of padding-bottom to the Interface body
import { test, expect } from './base.js'
import { go, watch } from './helpers.js'

const IOS_UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1'
const BUILT = [
  { id: 'interface', name: 'Interface' }, { id: 'article', name: 'Article' },
  { id: 'landing', name: 'Landing page' }, { id: 'specimen', name: 'Specimen' },
]
const VERDICT_FG = ['#000000', '#767676', '#949494', '#AAAAAA']

async function open(browser, { width, height, phone = false, query = '' }) {
  const ctx = await browser.newContext({
    viewport: { width, height },
    ...(phone ? { deviceScaleFactor: 3, isMobile: true, hasTouch: true, userAgent: IOS_UA } : {}),
  })
  await ctx.addInitScript(() => { try { localStorage.setItem('vs-t', 'light') } catch { /* private mode */ } })
  const page = await ctx.newPage()
  await go(page, `/create/contrast${query}`)
  return { ctx, page }
}

const views = (page) => page.getByRole('group', { name: 'Preview the pair on' })
async function pick(page, view) {
  await views(page).getByRole('button', { name: view.name, exact: true }).click()
  await expect(views(page).getByRole('button', { name: view.name, exact: true })).toHaveAttribute('aria-pressed', 'true')
  const pv = page.locator('.cc-pv[data-pair="true"]')
  await expect(pv, `${view.name} is on the page`).toHaveAttribute('data-scene', view.id)
  await expect.poll(() => pv.locator('[data-size]').count(), { message: `${view.name}: parts were sorted into tests` }).toBeGreaterThan(3)
  return pv
}
const frameAt = async (page) => (await page.locator('.cc-frame').boundingBox())

test.describe('Contrast Checker · the first view', () => {
  test('N1: opens on Interface, with no click, and Specimen is the last option', async ({ page }) => {
    watch(page, 'a designer opening the checker cold')
    await go(page, '/create/contrast')
    const group = views(page)
    await expect(group.getByRole('button', { name: 'Interface', exact: true })).toHaveAttribute('aria-pressed', 'true')
    await expect(page.locator('.cc-pv[data-scene="interface"]')).toHaveCount(1)
    // Interface first, Specimen last, Article and Landing page between them.
    const names = await group.getByRole('button').evaluateAll((bs) => bs.map((b) => b.getAttribute('aria-label')))
    expect(names).toEqual(['Interface', 'Article', 'Landing page', 'Specimen'])
  })
})

test.describe('Contrast Checker · the fixed frame keeps the page still', () => {
  for (const vp of [{ width: 1440, height: 900, phone: false }, { width: 390, height: 844, phone: true }]) {
    test(`N3: the page is the same height for every view and verdict at ${vp.width}`, async ({ browser }) => {
      const { ctx, page } = await open(browser, vp)
      watch(page, 'someone trying pairs on every view')
      await page.locator('#cc-bg').fill('#FFFFFF')
      const seen = []
      for (const view of BUILT) {
        await pick(page, view)
        for (const fg of VERDICT_FG) {
          await page.locator('#cc-fg').fill(fg)
          await expect(page.locator('.cc-ratio-num')).not.toHaveText('')
          seen.push({ at: `${view.name} ${fg}`, h: await page.evaluate(() => document.documentElement.scrollHeight) })
        }
      }
      expect(seen).toHaveLength(BUILT.length * 4) // POSITIVE CONTROL: every combination was measured
      const hs = seen.map((s) => s.h)
      expect(Math.max(...hs) - Math.min(...hs), seen.map((s) => `${s.at}=${s.h}`).join(', ')).toBeLessThanOrEqual(1)
      await ctx.close()
    })
  }

  for (const [width, want] of [[1440, 520], [1024, 520], [768, 480], [390, 440]]) {
    test(`the frame is ${want}px tall at ${width}, for every view`, async ({ browser }) => {
      const { ctx, page } = await open(browser, { width, height: 900, phone: width < 500 })
      watch(page, 'someone resizing the window')
      for (const view of BUILT) {
        await pick(page, view)
        const box = await frameAt(page)
        expect(Math.round(box.height), `${view.name} frame at ${width}px`).toBe(want)
      }
      await ctx.close()
    })
  }
})

test.describe('Contrast Checker · nothing in a view is cut off', () => {
  for (const [width, height] of [[1440, 900], [1024, 800], [768, 1024], [390, 844], [320, 568]]) {
    test(`N10: every part of every view sits inside the frame at ${width}`, async ({ browser }) => {
      const { ctx, page } = await open(browser, { width, height, phone: width < 500 })
      watch(page, 'someone on a window of that width')
      for (const view of BUILT) {
        const pv = await pick(page, view)
        const read = await pv.evaluate((root) => {
          const box = root.getBoundingClientRect()
          const out = [...root.querySelectorAll('*')].filter((el) => el.getClientRects().length && getComputedStyle(el).visibility !== 'hidden')
            .map((el) => ({ cls: String(el.className.baseVal ?? el.className).slice(0, 30) || el.tagName, r: el.getBoundingClientRect() }))
            .filter((x) => x.r.height > 0 && (x.r.bottom > box.bottom + 1 || x.r.right > box.right + 1))
          return { scroll: root.scrollHeight - root.clientHeight, wide: root.scrollWidth - root.clientWidth, out: out.map((x) => x.cls) }
        })
        expect(read.scroll, `${view.name}: the view scrolls inside its frame`).toBeLessThanOrEqual(1)
        expect(read.wide, `${view.name}: the view scrolls sideways`).toBeLessThanOrEqual(0)
        expect(read.out, `${view.name}: parts past the frame edge`).toEqual([])
      }
      await ctx.close()
    })
  }
})

test.describe('Contrast Checker · two colours, no entrance, no internal labels', () => {
  test('N5: every painted fill and stroke is the text colour or the background', async ({ page }) => {
    watch(page, 'a designer checking the pair is the only paint')
    await go(page, '/create/contrast?fg=1F2937&bg=F8FAFC')
    const OK = new Set(['rgb(31, 41, 55)', 'rgb(248, 250, 252)'])
    for (const view of BUILT) {
      const pv = await pick(page, view)
      await page.evaluate(() => { for (const a of document.getAnimations()) { try { a.finish() } catch { /* endless */ } } })
      const bad = await pv.evaluate((root, ok) => {
        const out = []
        for (const el of [root, ...root.querySelectorAll('*')]) {
          const cs = getComputedStyle(el)
          const name = `${String(el.className.baseVal ?? el.className).slice(0, 28) || el.tagName}`
          const flag = (what, v) => { if (v && !ok.includes(v)) out.push(`${name} ${what} ${v}`) }
          if (cs.backgroundColor !== 'rgba(0, 0, 0, 0)') flag('background', cs.backgroundColor)
          for (const side of ['Top', 'Right', 'Bottom', 'Left']) {
            if (parseFloat(cs[`border${side}Width`]) > 0 && cs[`border${side}Style`] !== 'none') flag(`border-${side}`, cs[`border${side}Color`])
          }
          if (el instanceof SVGElement) {
            if (cs.fill !== 'none') flag('fill', cs.fill)
            if (cs.stroke !== 'none') flag('stroke', cs.stroke)
          }
        }
        return out
      }, [...OK])
      expect(bad, `${view.name}: paint that is neither colour of the pair`).toEqual([])
    }
  })

  test('N6: no view prints an internal slot label', async ({ page }) => {
    watch(page, 'a designer reading every word of every view')
    await go(page, '/create/contrast')
    for (const view of BUILT) {
      const pv = await pick(page, view)
      const text = await pv.evaluate((el) => el.innerText)
      expect(text.length, `${view.name} has copy`).toBeGreaterThan(60)
      for (const label of ['70% text', '45% text', '20% text']) expect(text, `${view.name} prints "${label}"`).not.toContain(label)
    }
  })

  test('N7: switching views starts no keyframe animation', async ({ page }) => {
    watch(page, 'someone flipping between views quickly')
    await go(page, '/create/contrast?fg=777777&bg=FFFFFF')
    await pick(page, BUILT[0])
    for (const view of [...BUILT.slice(1), BUILT[0]]) { // every view is switched to, the first one last
      await pick(page, view)
      // The 150ms outline fade on a mark is a transition and stays; a keyframe
      // animation (an entrance) is what must not run.
      const running = await page.evaluate(() => document.getAnimations()
        .filter((a) => a.playState === 'running' && !(a instanceof CSSTransition))
        .map((a) => a.animationName || a.id || 'animation'))
      expect(running, `${view.name}: animations running right after the switch`).toEqual([])
    }
  })
})

test.describe('Contrast Checker · the legend and the specimen', () => {
  test('N9: the legend is on every view, and Specimen has a part of each test', async ({ page }) => {
    watch(page, 'someone reading the legend on the specimen')
    await go(page, '/create/contrast?fg=777777&bg=FFFFFF')
    for (const view of BUILT) {
      const pv = await pick(page, view)
      await expect(page.getByRole('heading', { name: 'Where each test lands' }), `${view.name}: legend heading`).toBeVisible()
      await expect(page.getByRole('group', { name: 'Tests' }).getByRole('button'), `${view.name}: three chips`).toHaveCount(3)
      for (const cls of ['body', 'large', 'ui']) {
        expect(await pv.locator(`[data-size="${cls}"]`).count(), `${view.name}: no ${cls} part`).toBeGreaterThan(0)
      }
    }
  })
})

test.describe('Contrast Checker · the ratio on a narrow screen', () => {
  test('N8: at 390x844 the fields, the ratio and the top 300px of the preview are on screen, in that order', async ({ browser }) => {
    const { ctx, page } = await open(browser, { width: 390, height: 844, phone: true })
    watch(page, 'someone checking a pair on their phone')
    await expect(page.locator('.cc-ratio-num')).toBeVisible()
    await expect(page.locator('.cc-pairbar')).toBeVisible()
    await expect(page.locator('.cc-pv')).toBeVisible()
    const read = await page.evaluate(() => {
      const r = (sel) => { const b = document.querySelector(sel).getBoundingClientRect(); return { top: Math.round(b.top), bottom: Math.round(b.bottom) } }
      const tabs = document.querySelector('.pnav-tabs')
      return {
        pairbar: r('.cc-pairbar'), ratio: r('.cc-ratio-num'), pv: r('.cc-pv'),
        floor: Math.round(tabs ? tabs.getBoundingClientRect().top : window.innerHeight), count: document.querySelectorAll('.cc-ratio-num').length,
      }
    })
    expect(read.count, 'the ratio is printed once').toBe(1)
    expect(read.pairbar.bottom, 'the fields come first').toBeLessThanOrEqual(read.ratio.top)
    expect(read.ratio.bottom, 'the ratio sits above the preview').toBeLessThanOrEqual(read.pv.top)
    expect(read.ratio.bottom, 'the ratio ends above the tab bar').toBeLessThanOrEqual(read.floor)
    expect(read.floor - read.pv.top, `only ${read.floor - read.pv.top}px of the preview is above the tab bar`).toBeGreaterThanOrEqual(300)
    await ctx.close()
  })

  test('the ratio sits in the result panel above 900px and under the fields at 900px and below', async ({ browser }) => {
    for (const [width, inPanel] of [[1440, true], [901, true], [900, false], [768, false]]) {
      const { ctx, page } = await open(browser, { width, height: 900 })
      watch(page, `a window ${width}px wide`)
      await expect(page.locator('.cc-ratio-num')).toHaveCount(1)
      expect(await page.locator('.cc-panel .cc-ratio-num').count(), `${width}px: ratio in panel`).toBe(inPanel ? 1 : 0)
      await ctx.close()
    }
  })
})

// ── Fix round 1 ──────────────────────────────────────────────────────────────
//
//   R1  a view whose chunk fails to load can be tried again, and then it renders
//   R2  the Interface frame holds the whole view on a phone (390, 375, 360, 320)
//   R3  the fixes reserve is the same height as the fullest live state, so the
//       bottom of the panel does not move when the wording is the longest
//
// MUTATIONS:
//   R1  make retryPairExample() a no-op in views/registry.js (the stub stays cached)
//   R2  add 40px of padding-bottom to `.ro .ro-main` in Interface.css (the buttons pass the frame)
//   R3  shorten the ghost row wording in ContrastChecker.jsx ("Lighten background to " to "Darken text to ")
const CHUNK_RE = /\/assets\/Interface-[\w-]{8}\.js$/

test.describe('Contrast Checker · a view that did not load', () => {
  test('R1: the failure names the view, and Try again fetches it and draws it', async ({ browser }) => {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
    await context.addInitScript(() => { try { localStorage.setItem('vs-t', 'light') } catch { /* private mode */ } })
    const p = await context.newPage()
    // No watch(): the aborted download is the point, and it logs a console error.
    await p.route(CHUNK_RE, (route) => route.abort('failed'))
    await go(p, '/create/contrast')
    const fail = p.locator('.cc-pv-fail')
    await expect(fail, 'the stub is in the frame').toBeVisible()
    await expect(fail).toContainText("This view didn't load.")
    await expect(fail).not.toContainText('example')
    await expect(p.locator('.cc-pv[data-scene="interface"] .ro')).toHaveCount(0)
    // The fields and the numbers keep working while the picture is missing.
    await p.locator('#cc-fg').fill('#000000')
    await expect(p.locator('.cc-ratio-num')).toContainText('21')
    // The frame is not announced as a picture while it holds a button.
    await expect(p.locator('.cc-pv')).not.toHaveAttribute('role', 'img')
    const retry = fail.getByRole('button', { name: 'Try again' })
    await expect(retry).toBeVisible()

    await p.unroute(CHUNK_RE)
    await retry.click()
    await expect(p.locator('.cc-pv[data-scene="interface"] .ro'), 'the view renders after Try again').toHaveCount(1)
    await expect(p.locator('.cc-pv-fail')).toHaveCount(0)
    await expect(p.locator('.cc-pv')).toHaveAttribute('role', 'img')
    await expect.poll(() => p.locator('.cc-pv [data-size]').count(), { message: 'the view was sorted into tests again' }).toBeGreaterThan(3)
    await context.close()
  })
})

test.describe('Contrast Checker · Interface on a phone', () => {
  for (const [width, height] of [[390, 844], [375, 667], [360, 740], [320, 568]]) {
    test(`R2: the whole Interface view and the email address sit inside the frame at ${width}`, async ({ browser }) => {
      const { ctx, page } = await open(browser, { width, height, phone: true })
      watch(page, `a phone ${width}px wide`)
      await expect(page.locator('.cc-pv[data-scene="interface"] .ro-foot')).toBeVisible()
      await page.evaluate(() => document.fonts.ready)
      // Read before any element screenshot: those turn pointer:coarse off.
      expect(await page.evaluate(() => matchMedia('(pointer: coarse)').matches), 'POSITIVE CONTROL: a touch context').toBe(true)
      const read = await page.evaluate(() => {
        const pv = document.querySelector('.cc-pv')
        const frame = document.querySelector('.cc-frame').getBoundingClientRect()
        const foot = document.querySelector('.ro-foot').getBoundingClientRect()
        const inv = document.querySelector('.ro-inv')
        const input = document.querySelector('.ro-input').getBoundingClientRect()
        const text = inv.getBoundingClientRect()
        return {
          over: pv.scrollHeight - pv.clientHeight, footPast: foot.bottom - frame.bottom,
          emailCut: inv.scrollWidth - inv.clientWidth, emailPast: text.right - (input.right - 1),
        }
      })
      expect(read.over, `the view is ${read.over}px taller than its frame`).toBeLessThanOrEqual(0)
      expect(read.footPast, 'the buttons end past the frame').toBeLessThanOrEqual(0)
      expect(read.emailCut, 'the email address is cut').toBeLessThanOrEqual(0)
      expect(read.emailPast, 'the email address runs past its box').toBeLessThanOrEqual(0)
      await ctx.close()
    })
  }
})

// R2 for the views built in part 2: the whole view sits in the frame on a phone, no
// line of text is cut by its own box, and the headline and the buttons are whole.
// MUTATION: add 40px of padding-bottom to `.bs` in Article.css, or `.tw` in Landing.css.
test.describe('Contrast Checker · Article and Landing page on a phone', () => {
  for (const [width, height] of [[390, 844], [375, 667], [360, 740], [320, 568]]) {
    test(`R2: Article and Landing page sit whole inside the frame at ${width}`, async ({ browser }) => {
      const { ctx, page } = await open(browser, { width, height, phone: true })
      watch(page, `a phone ${width}px wide`)
      await page.evaluate(() => document.fonts.ready)
      expect(await page.evaluate(() => matchMedia('(pointer: coarse)').matches), 'POSITIVE CONTROL: a touch context').toBe(true)
      for (const view of BUILT.filter((v) => v.id === 'article' || v.id === 'landing')) {
        const pv = await pick(page, view)
        await page.evaluate(() => document.fonts.ready)
        const read = await pv.evaluate((root) => {
          const box = root.getBoundingClientRect()
          const shown = [...root.querySelectorAll('*')].filter((el) => el.getClientRects().length && getComputedStyle(el).visibility !== 'hidden')
          const named = (el) => String(el.className.baseVal ?? el.className).slice(0, 28) || el.tagName
          return {
            over: root.scrollHeight - root.clientHeight,
            wide: root.scrollWidth - root.clientWidth,
            past: shown.filter((el) => { const r = el.getBoundingClientRect(); return r.height > 0 && (r.bottom > box.bottom + 1 || r.right > box.right + 1) }).map(named),
            cut: shown.filter((el) => !(el instanceof SVGElement) && el.children.length === 0 && el.clientWidth > 0 && el.scrollWidth > el.clientWidth + 1).map(named),
            // Two sections laid over each other: the direct children of the view's root.
            laid: (() => {
              const kids = [...root.firstElementChild.children].filter((k) => k.getClientRects().length)
              const hit = []
              for (let i = 0; i < kids.length; i++) for (let j = i + 1; j < kids.length; j++) {
                const a = kids[i].getBoundingClientRect(); const b = kids[j].getBoundingClientRect()
                if (a.left < b.right - 1 && b.left < a.right - 1 && a.top < b.bottom - 1 && b.top < a.bottom - 1) hit.push(`${named(kids[i])}/${named(kids[j])}`)
              }
              return hit
            })(),
          }
        })
        expect(read.over, `${view.name}: ${read.over}px taller than its frame`).toBeLessThanOrEqual(0)
        expect(read.wide, `${view.name}: scrolls sideways`).toBeLessThanOrEqual(0)
        expect(read.past, `${view.name}: parts past the frame edge`).toEqual([])
        expect(read.cut, `${view.name}: text cut by its own box`).toEqual([])
        expect(read.laid, `${view.name}: sections laid over each other`).toEqual([])
      }
      await ctx.close()
    })
  }
})

test.describe('Contrast Checker · the fixes reserve', () => {
  test('R3: the page never changes height at 1440 and 390, and at 390 the reserve holds the fullest state so the bottom of the panel stays still', async ({ browser }) => {
    for (const vp of [{ width: 1440, height: 900, phone: false }, { width: 390, height: 844, phone: true }]) {
      const { ctx, page } = await open(browser, vp)
      watch(page, `a window ${vp.width}px wide`)
      await page.evaluate(() => document.fonts.ready)
      // Two fixes under the 4.5:1 lede is the fullest state; the reserve is that at 390 and one row from 901px.
      const tops = []
      for (const fg of ['#AAAAAA', '#949494', '#767676', '#000000', '#AAAAAA']) {
        await page.locator('#cc-fg').fill(fg)
        await expect(page.locator('.cc-ratio-num')).not.toHaveText('')
        const read = await page.evaluate(() => {
          // The reserve's own height: in the shared cell it would stretch to the
          // taller of the two, which hides a reserve that is too short.
          const ghostEl = document.querySelector('.cc-fixes-ghost')
          ghostEl.style.alignSelf = 'start'
          const ghost = ghostEl.getBoundingClientRect().height
          ghostEl.style.alignSelf = ''
          return {
          ghost,
          live: document.querySelector('.cc-fixes-live').getBoundingClientRect().height,
          panelEnd: Math.round(document.querySelector('.cc-panel').getBoundingClientRect().bottom + scrollY),
          page: document.documentElement.scrollHeight,
          }
        })
        // Below 901px the reserve holds the fullest state; from 901px it holds
        // one row by design, and the page height is what stays still there.
        if (vp.width < 901) expect(read.live, `${fg}: the live fixes are ${read.live}px and the reserve ${read.ghost}px`).toBeLessThanOrEqual(read.ghost + 1)
        tops.push({ fg, ...read })
      }
      if (vp.width < 901) {
        const ys = tops.map((t) => t.panelEnd)
        expect(Math.max(...ys) - Math.min(...ys), JSON.stringify(tops)).toBeLessThanOrEqual(1)
      }
      const pages = tops.map((t) => t.page)
      expect(Math.max(...pages) - Math.min(...pages), `page heights ${JSON.stringify(pages)}`).toBeLessThanOrEqual(1)
      await ctx.close()
    }
  })

  test('the panel at 1440x900 is as tall as its content, so its last section is whole', async ({ browser }) => {
    const { ctx, page } = await open(browser, { width: 1440, height: 900 })
    watch(page, 'someone on a laptop')
    await page.evaluate(() => document.fonts.ready)
    const read = await page.evaluate(() => {
      const panel = document.querySelector('.cc-panel')
      return { clip: panel.scrollHeight - panel.clientHeight, overflowY: getComputedStyle(panel).overflowY, last: document.querySelector('.cc-fixes-sec').getBoundingClientRect().bottom, panel: panel.getBoundingClientRect().bottom }
    })
    expect(read.clip, 'the panel scrolls inside itself').toBeLessThanOrEqual(0)
    expect(read.overflowY).toBe('visible')
    expect(read.last, 'the last section ends inside the panel').toBeLessThanOrEqual(read.panel)
    await ctx.close()
  })
})
