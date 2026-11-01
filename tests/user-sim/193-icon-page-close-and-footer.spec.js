// THE ICON PAGES END AT THE FOOTER: NO SALES CLOSE AND NO SPECTRUM STRIP.
//
// /create/icons, /create/icons/groups and /create/emoji end at SpectrumFooter, outside <main>. The icon sets'
// licence credits live in the footer's `.sp-footer-notice` row, not in a strip under the grid. The only call
// to action a viewer meets before the footer is the Icon panel's own end block (spec 184 and spec 194). Past
// three automatic pages the grid's scroll sentinel becomes a "Show N more icons" button, so the footer can be
// reached by scrolling.
//
// What a person relies on, and what this file pins (expected values written out, not read from src):
//   - exactly one contentinfo and one main on each route, no `.ig-credit` strip, no `.ig-close` block, no
//     spectrum strip and none of the old close's words, on all three tabs;
//   - the licence row names every set on screen with its licence and a link out, then "Every licence in
//     full" to /credits; the Emoji tab and the Groups index have no licence row; a group names its own sets;
//   - after three automatic pages the grid waits for a press, and the footer is reachable by scrolling;
//   - nothing scrolls sideways at 320, 390, 768 or 1440;
//   - Tab runs from the end block's last action into the footer.
//
// HOW TO SEE EACH FAIL (src/ unless named):
//   CreateTool.jsx renders <AppFooter compact /> on the icon routes     -> "one contentinfo" and "licence row"
//   IconEmojiLibrary.jsx renders a .ig-close block or a SpectrumRamp     -> "no close, no strip" and "nothing scrolls sideways"
//   IconLibrary.jsx goes back to the bare sentinel (no .ig-more)         -> "Show 120 more icons"
//   IconCredits.jsx drops the links, or IconGroups stops reporting        -> "licence row" and "group"
import { test, expect } from './base.js'
import { chooseMenuOption, go, signIn, watch } from './helpers.js'
import { ICONIFY_HOSTS, ICONIFY_STUB_HEADER, isLiveIconify } from './iconify-stub.js'

const SIGNED_OUT = 'a designer who has not signed up yet, reaching the end of the icon pages'
const OLD_CLOSE_HEADLINE = 'Now pick the colours and type.'

// The five sets a signed-out viewer sees on the Icon tab, with the page each links to.
const ANON_SETS = [
  { name: 'Lucide', href: 'https://github.com/lucide-icons/lucide' },
  { name: 'Tabler Icons', href: 'https://github.com/tabler/tabler-icons' },
  { name: 'Iconoir', href: 'https://github.com/iconoir-icons/iconoir' },
  { name: 'Heroicons', href: 'https://github.com/tailwindlabs/heroicons' },
  { name: 'Phosphor', href: 'https://github.com/phosphor-icons/core' },
]

const footer = (page) => page.getByRole('contentinfo')
const noticeOf = (page) => footer(page).locator('.sp-footer-notice')

/** The route is up and the first real cells (or emoji) have replaced any skeleton. */
async function open(page, route, { plan } = {}) {
  if (plan) await signIn(page, { plan })
  await go(page, route)
  if (route === '/create/emoji') await expect(page.locator('.emoji-cell').first()).toBeVisible({ timeout: 20_000 })
  else if (route === '/create/icons') await expect(page.locator('.ig .ic').first()).toBeVisible({ timeout: 20_000 })
  await expect(footer(page)).toHaveCount(1)
}

/** The page has no sales close: no block, no strip, and none of the old words. */
async function expectNoClose(page, what) {
  await expect(page.locator('.ig-close'), `${what}: the close block is gone`).toHaveCount(0)
  await expect(page.locator('.sp-ramp'), `${what}: the spectrum strip is gone`).toHaveCount(0)
  await expect(page.getByRole('region', { name: OLD_CLOSE_HEADLINE }), `${what}: the close region is gone`).toHaveCount(0)
  expect(await page.locator('body').innerText(), `${what}: the close's headline is gone`).not.toContain(OLD_CLOSE_HEADLINE)
  await expect(page.getByRole('link', { name: 'Open the Palette Builder' }), `${what}: the close's primary link is gone`).toHaveCount(0)
}

/** Boxes of the named selectors, as {l,r,t,b,w,h}. */
async function boxes(page, map) {
  return page.evaluate((m) => Object.fromEntries(Object.entries(m).map(([k, sel]) => {
    const r = document.querySelector(sel).getBoundingClientRect()
    return [k, { l: r.left, r: r.right, t: r.top, b: r.bottom, w: r.width, h: r.height }]
  })), map)
}

for (const [width, ctx] of [
  [1440, { viewport: { width: 1440, height: 900 } }],
  [768, { viewport: { width: 768, height: 1024 } }],
  [390, { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }],
]) {
  test.describe(`at ${width}`, () => {
    test.use(ctx)

    test('/create/icons signed out: one footer, no old strip, no close', async ({ page }) => {
      watch(page, SIGNED_OUT)
      await open(page, '/create/icons')
      await expect(page.getByRole('contentinfo'), 'one contentinfo landmark').toHaveCount(1)
      await expect(page.getByRole('main'), 'one main landmark').toHaveCount(1)
      await expect(page.locator('footer'), 'one footer element').toHaveCount(1)
      await expect(page.locator('.ig-credit'), 'the strip under the grid is gone').toHaveCount(0)
      await expectNoClose(page, '/create/icons')
      // The one thing between the grid and the footer is the gate, which is the page's single call to action.
      await expect(page.getByRole('main').locator('.ig-end'), 'the gate is page content, inside main').toHaveCount(1)
      await expect(footer(page).locator('.ig-end'), 'the gate is not inside the footer').toHaveCount(0)
      await expect(footer(page).getByRole('link', { name: 'Open the toolkit' })).toBeVisible()
    })

    test('/create/icons signed out: the gate is the only Log in before the footer', async ({ page }) => {
      watch(page, SIGNED_OUT)
      await open(page, '/create/icons')
      await expect(page.getByRole('main').getByRole('button', { name: 'Log in', exact: true }), 'one Log in button in main, and it is the gate’s').toHaveCount(1)
      await expect(page.locator('.ig-end .ig-end-pill')).toHaveText('Log in')
      await expect(page.locator('.ig-end'), 'the gate says the new heading').toContainText('Log in to open all 12 sets.')
    })

    test('/create/icons signed out: the licence row names each set with its licence and a link', async ({ page }) => {
      watch(page, SIGNED_OUT)
      await open(page, '/create/icons')
      const notice = noticeOf(page)
      await expect(notice, 'the licence row sits inside the contentinfo landmark').toHaveCount(1)
      await expect(notice.locator('.sp-footer-notice-h')).toHaveText('Icon sets on this page')
      const list = notice.locator('.sp-footer-notice-list')
      for (const set of ANON_SETS) {
        const link = list.getByRole('link', { name: set.name, exact: true })
        await expect(link, `${set.name} is a link`).toHaveCount(1)
        await expect(link).toHaveAttribute('href', set.href)
        await expect(link, 'a set page opens in a new tab').toHaveAttribute('target', '_blank')
        await expect(link).toHaveAttribute('rel', /noopener/)
      }
      await expect(list.getByRole('link'), 'five sets and Every licence in full').toHaveCount(ANON_SETS.length + 1)
      await expect(list.getByRole('link', { name: 'Every licence in full' })).toHaveAttribute('href', '/credits')
      const text = (await list.textContent()).replace(/\s+/g, ' ').trim()
      expect(text, 'each set with its licence in brackets').toBe('Lucide (ISC), Tabler Icons (MIT), Iconoir (MIT), Heroicons (MIT), Phosphor (MIT). Every licence in full')
      const b = await boxes(page, { grid: '.sp-footer-grid', notice: '.sp-footer-notice', legal: '.sp-footer-legal' })
      expect(b.notice.t, 'the row is under the link columns').toBeGreaterThanOrEqual(b.grid.b - 1)
      expect(b.legal.t, 'the baseline is under the row').toBeGreaterThanOrEqual(b.notice.b - 1)
    })

    test('/create/emoji: the footer is there with no close, no licence row and a Credits link', async ({ page }) => {
      watch(page, SIGNED_OUT)
      await open(page, '/create/emoji')
      await expect(page.getByRole('contentinfo')).toHaveCount(1)
      await expect(page.getByRole('main')).toHaveCount(1)
      await expectNoClose(page, '/create/emoji')
      await expect(page.locator('.sp-footer-notice'), 'emoji ships no third-party artwork to credit').toHaveCount(0)
      await expect(page.locator('.ig-credit')).toHaveCount(0)
      await expect(footer(page).getByRole('link', { name: 'Credits', exact: true })).toHaveAttribute('href', '/credits')
    })

    test('/create/icons/groups: the index has no licence row, an open group names its own sets', async ({ page }) => {
      watch(page, SIGNED_OUT)
      await go(page, '/create/icons/groups')
      await expect(page.getByRole('contentinfo')).toHaveCount(1)
      await expect(page.locator('.igp-page')).toBeVisible()
      await expectNoClose(page, '/create/icons/groups')
      await expect(page.locator('.sp-footer-notice'), 'the index shows no glyphs to credit').toHaveCount(0)

      await go(page, '/create/icons/groups?group=wayfinding')
      await expect(page.locator('.igp-grid .ic').first()).toBeVisible({ timeout: 20_000 })
      await expectNoClose(page, '/create/icons/groups?group=wayfinding')
      const notice = noticeOf(page)
      await expect(notice.locator('.sp-footer-notice-h')).toHaveText('Icon sets in this group')
      const text = (await notice.locator('.sp-footer-notice-list').textContent()).replace(/\s+/g, ' ').trim()
      expect(text, 'the Wayfinding group draws from Lucide and Tabler').toBe('Lucide (ISC), Tabler Icons (MIT). Every licence in full')
      await expect(notice.getByRole('link', { name: 'Lucide', exact: true })).toHaveAttribute('href', 'https://github.com/lucide-icons/lucide')
      await expect(page.getByRole('contentinfo')).toHaveCount(1)
    })

    test('/create/icons/groups: a Pro group is locked for a signed-out viewer and credits nothing', async ({ page }) => {
      watch(page, SIGNED_OUT)
      await go(page, '/create/icons/groups?group=commerce')
      await expect(page.locator('.igp-page')).toBeVisible()
      await expectNoClose(page, '/create/icons/groups?group=commerce')
      await expect(page.locator('.sp-footer-notice'), 'no glyphs are drawn, so no sets are credited').toHaveCount(0)
      await expect(footer(page).getByRole('link', { name: 'Credits', exact: true })).toBeVisible()
    })

    for (const route of ['/create/icons', '/create/emoji', '/create/icons/groups', '/create/icons/groups?group=wayfinding']) {
      test(`${route}: nothing scrolls sideways at the foot of the page`, async ({ page }) => {
        watch(page, SIGNED_OUT)
        await go(page, route)
        await expect(footer(page)).toHaveCount(1)
        await page.locator('.sp-footer').scrollIntoViewIfNeeded()
        await page.evaluate(() => window.scrollBy(300, 0))
        const m = await page.evaluate(() => {
          const el = document.documentElement
          const view = el.clientWidth
          // Everything in the gate (when there is one) and the footer stays inside the window.
          const wide = [...document.querySelectorAll('.ig-end, .ig-end *, footer, footer *')]
            .filter((n) => n.getClientRects().length)
            .map((n) => ({ n, r: n.getBoundingClientRect() }))
            .filter(({ r }) => r.right > view + 1 || r.left < -1)
            .map(({ n, r }) => `${n.tagName.toLowerCase()}.${String(n.className).split(' ')[0]} ${Math.round(r.left)}..${Math.round(r.right)}`)
          return { view, scrollWidth: el.scrollWidth, scrollX: window.scrollX, wide }
        })
        expect(m.scrollWidth, 'the page is no wider than the window').toBeLessThanOrEqual(m.view)
        expect(m.scrollX, 'the page cannot be dragged sideways').toBe(0)
        expect(m.wide, 'gate or footer content outside the window').toEqual([])
      })
    }
  })
}

test.describe('at 320', () => {
  test.use({ viewport: { width: 320, height: 640 }, isMobile: true, hasTouch: true })
  for (const route of ['/create/icons', '/create/emoji', '/create/icons/groups']) {
    test(`${route}: no sideways scroll, and the gate heading wraps to three lines at most`, async ({ page }) => {
      watch(page, SIGNED_OUT)
      await go(page, route)
      await expect(footer(page)).toHaveCount(1)
      if (route === '/create/icons') await expect(page.locator('.ig-end-h')).toBeVisible({ timeout: 20_000 })
      await page.locator('.sp-footer').scrollIntoViewIfNeeded()
      const m = await page.evaluate(() => {
        const el = document.documentElement
        const h = document.querySelector('.ig-end-h')
        const line = h ? parseFloat(getComputedStyle(h).lineHeight) : 0
        return { scrollWidth: el.scrollWidth, view: el.clientWidth, lines: h ? Math.round(h.getBoundingClientRect().height / line) : 0 }
      })
      expect(m.scrollWidth).toBeLessThanOrEqual(m.view)
      if (route === '/create/icons') expect(m.lines, 'gate heading lines at 320').toBeGreaterThan(0)
      expect(m.lines, 'gate heading lines at 320').toBeLessThanOrEqual(3)
    })
  }
})

test.describe('keyboard', () => {
  test.use({ viewport: { width: 1440, height: 900 } })

  test('Tab runs the gate’s Log in, then See the plans, then on into the footer', async ({ page }) => {
    watch(page, SIGNED_OUT)
    await open(page, '/create/icons')
    await page.locator('.ig-end .ig-end-pill').focus()
    await page.keyboard.press('Tab')
    await expect(page.locator(':focus')).toHaveText('See the plans')
    // Anything focusable between the gate and the footer is page content that is not a call to action, so
    // the footer must come within a few more presses.
    let inFooter = false
    for (let i = 0; i < 6 && !inFooter; i += 1) {
      await page.keyboard.press('Tab')
      inFooter = (await footer(page).locator(':focus').count()) === 1
    }
    expect(inFooter, 'Tab never reached the footer from the gate').toBe(true)
  })
})

// ── After three automatic pages the grid waits for a press ────────────────────────────────────────
const TOTAL = 800
const NAME = (i) => `more-${String(i).padStart(3, '0')}`
const BODY = '<path fill="none" stroke="currentColor" stroke-width="2" d="M3 12h18"/>'

/** Serve TOTAL lucide names, and a glyph batch answer for any of them, over the Iconify fixture. */
async function serveLucide(page) {
  const names = Array.from({ length: TOTAL }, (_, i) => NAME(i))
  const headers = { 'access-control-allow-origin': '*', [ICONIFY_STUB_HEADER]: '1' }
  // The page reads a pack's list from the site's own copy first, so the synthetic list is served there.
  // The /collection route below stays for the request a pack with no copy falls back to.
  await page.route((u) => u.pathname === '/iconify/collections/lucide.json',
    (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ prefix: 'lucide', total: TOTAL, title: 'lucide', uncategorized: names }) }))
  await page.route((u) => ICONIFY_HOSTS.includes(u.hostname) && u.pathname === '/collection' && u.searchParams.get('prefix') === 'lucide',
    (route) => route.fulfill({ status: 200, contentType: 'application/json', headers, body: JSON.stringify({ prefix: 'lucide', total: TOTAL, title: 'lucide', uncategorized: names }) }))
  await page.route((u) => ICONIFY_HOSTS.includes(u.hostname) && u.pathname === '/lucide.json' && u.search.includes('icons='),
    (route) => {
      const asked = (new URL(route.request().url()).searchParams.get('icons') || '').split(',').filter(Boolean)
      const icons = Object.fromEntries(asked.map((n) => [n, { body: BODY }]))
      return route.fulfill({ status: 200, contentType: 'application/json', headers, body: JSON.stringify({ prefix: 'lucide', width: 24, height: 24, icons, aliases: {} }) })
    })
}

/** Pick an icon pack, from the inline control on a wide screen or from the Filters panel or sheet. */
async function choosePack(page, pack) {
  const filters = page.getByRole('button', { name: /^Filters\b/ })
  const sheet = page.getByRole('dialog', { name: 'Filters' })
  // The pack menu sits on the toolbar when it fits; otherwise it is in the Filters panel.
  const inPanel = !(await page.locator('.ig-toolbar').getByRole('button', { name: 'Icon pack' }).isVisible()) && await filters.isVisible()
  const panel = sheet.or(page.getByRole('group', { name: 'Filters', exact: true }))
  if (inPanel) {
    await filters.click()
    await expect(panel).toBeVisible()
  }
  await chooseMenuOption(page, (inPanel ? panel : page.locator('.ig-toolbar')).getByRole('button', { name: 'Icon pack' }), pack)
  if (await sheet.isVisible()) {
    await sheet.getByRole('button', { name: 'Done', exact: true }).click()
    await expect(sheet).toBeHidden()
  } else if (inPanel) {
    await filters.click()
    await expect(panel).toBeHidden()
  }
}

test.describe('Show N more icons', () => {
  test.skip(isLiveIconify(), 'the live API decides which icons exist; this spec controls the answers')
  test.use({ viewport: { width: 1440, height: 900 } })

  test('a signed-in viewer reaches the footer after three loads, then presses on one page at a time', async ({ page }) => {
    watch(page, 'a Pro designer scrolling the whole icon list to reach the footer')
    await serveLucide(page)
    await signIn(page, { plan: 'pro' })
    await go(page, '/create/icons')
    await choosePack(page, 'lucide')
    await expect(page.locator(`.ig .ic[aria-label="Customise ${NAME(0)}"]`)).toBeVisible({ timeout: 20_000 })

    const cells = () => page.locator('.ig .ic').count()
    const more = page.locator('.ig-more').getByRole('button')
    // Three automatic pages: the first 120 and three more, each as the end of the grid scrolls into view,
    // then the button. The grid must stop at exactly 480: an observer callback queued during the last chunk
    // (at 440) used to start one more page from a stale count and reach 560.
    await expect.poll(async () => {
      await page.evaluate(() => document.querySelector('.ig-sentinel, .ig-more')?.scrollIntoView({ block: 'end' }))
      return page.locator('.ig-more').count()
    }, { timeout: 30_000, message: 'the sentinel never became a button' }).toBe(1)
    await expect(more).toBeVisible()
    // Let a reveal still in flight land before counting.
    let was = -1
    await expect.poll(async () => { const c = await cells(); const same = c === was; was = c; return same }, { intervals: [300], timeout: 10_000 }).toBe(true)
    const auto = await cells()
    expect(auto, 'the first page and three automatic ones, and not a cell more').toBe(480)
    await expect(more).toHaveText(`Show ${Math.min(120, TOTAL - auto)} more icons`)
    await expect(page.locator('.ig-sentinel')).toHaveCount(0)

    // The foot of the page is reachable, and the grid does not run on while we are there.
    await footer(page).scrollIntoViewIfNeeded()
    await expect(footer(page)).toBeInViewport()
    await expectNoClose(page, 'the foot of a Pro viewer’s list')
    await page.evaluate(() => new Promise((done) => {
      let n = 0
      const tick = () => (++n < 30 ? requestAnimationFrame(tick) : done())
      requestAnimationFrame(tick)
    }))
    expect(await cells(), 'nothing loaded by itself at the foot of the page').toBe(auto)

    // One press reveals one page; the label counts what is left; the last press removes the button.
    let have = auto
    while (have < TOTAL) {
      await expect(more).toHaveText(`Show ${Math.min(120, TOTAL - have)} more icons`)
      const want = Math.min(have + 120, TOTAL)
      await more.click()
      await expect.poll(cells, { timeout: 15_000, message: `one press from ${have} cells` }).toBe(want)
      have = want
    }
    await expect(page.locator('.ig-more'), 'the whole list is in; no button left').toHaveCount(0)
    await expect(page.getByRole('contentinfo')).toHaveCount(1)
  })

  // A browser queues one entry per frame for an observer and hands them over together, oldest first, when
  // its main thread was busy: a slow phone, or a CI machine running four browsers. The grid's observer used
  // to act on the first entry only, so a stale "not on screen" ahead of the current "on screen" left the
  // sentinel in view with nothing loading, and nothing to move it on (an observer reports a change, and the
  // sentinel was not going to change). This hands the grid's observer exactly that: a stale entry first.
  // HOW TO SEE IT FAIL: IconLibrary.jsx reads `([e])` in the sentinel's IntersectionObserver again -> the grid stays at 120.
  test('a stale "not on screen" entry ahead of the current one does not stop the grid loading its next page', async ({ page }) => {
    watch(page, 'a Pro designer on a slow phone, scrolling the icon list')
    await page.addInitScript(() => {
      const Real = window.IntersectionObserver
      window.IntersectionObserver = class extends Real {
        constructor(callback, options) {
          // Only the grid's sentinel observer (the one with the 600px margin); everything else is left alone.
          if (!options || options.rootMargin !== '600px') { super(callback, options); return }
          super((entries, observer) => {
            const stale = entries.map((e) => ({ target: e.target, isIntersecting: false, intersectionRatio: 0, time: e.time - 1 }))
            callback([...stale, ...entries], observer)
          }, options)
        }
      }
    })
    await serveLucide(page)
    await signIn(page, { plan: 'pro' })
    await go(page, '/create/icons')
    await choosePack(page, 'lucide')
    await expect(page.locator(`.ig .ic[aria-label="Customise ${NAME(0)}"]`)).toBeVisible({ timeout: 20_000 })
    await expect.poll(async () => {
      await page.evaluate(() => document.querySelector('.ig-sentinel, .ig-more')?.scrollIntoView({ block: 'end' }))
      return page.locator('.ig .ic').count()
    }, { timeout: 20_000, message: 'the grid never loaded a second page' }).toBeGreaterThan(120)
  })
})
