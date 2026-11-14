// /onboarding and /checkout (and /checkout/return) on a phone and a tablet.
//
// THE ROUTE SWEEP FOUND
//   /onboarding at 768: the three option rows sat inside an outer card (a card
//     in a card), and "Not now, take me to my projects" turned into a bare text
//     link about 20px tall. (The page is now the kit builder; see below.)
//   /checkout: the invalid-selection state drew a raw "!" character where
//     /checkout/return draws an icon, hugged the top-left of the page, and at
//     768 left a 520px card with dead space on its right.
//
// WHAT THIS PINS
//   Onboarding, signed in: the kit builder, in both themes at both widths. The
//     heading takes the theme's ink, nothing scrolls sideways, and the way out
//     ("Not now", the two other starts, the pill) is at least 44px tall.
//   Checkout and checkout return: the V3 state card (no raw "!" glyph) takes the
//     theme, is at most 560px wide, and sits clear of the nav.
//   Every width, both themes: no overflow and no target under 44px.
//
// STATES REACHED
//   Onboarding: signIn({ onboarded: false }) then /onboarding.
//   Checkout: the invalid-selection state (/checkout with no ?plan), which
//     80-account-quality.spec.js and 99-pricing-screen.spec.js also reach, signed
//     out and signed in. /checkout/return with no session_id is its error state,
//     as 69-flow-audit.spec.js reaches it. No Stripe call is made in any of them.
//
// Viewport-only screenshots go to .claude/scratch/phonb1/ for qa and the designer.
import fs from 'node:fs'
import path from 'node:path'
import { test, expect } from './base.js'
import { go, watch, signIn } from './helpers.js'

const WIDTHS = [390, 768]
const THEMES = ['light', 'dark']
const SHOTS = path.join(process.cwd(), '.claude', 'scratch', 'phonb1')

async function open(browser, { width, theme }) {
  const ctx = await browser.newContext({
    viewport: { width, height: width < 768 ? 844 : 1024 },
    colorScheme: theme,
    isMobile: true,
    hasTouch: true,
  })
  await ctx.addInitScript((t) => { try { localStorage.setItem('vs-t', t) } catch { /* private mode */ } }, theme)
  return { ctx, page: await ctx.newPage() }
}

// Every finite animation done, so a measurement or a screenshot is of the page
// at rest and not part-way through the first-paint fade.
async function settle(page) {
  await page.evaluate(() => Promise.all(
    document.getAnimations()
      .filter((a) => a.effect?.getTiming().iterations !== Infinity)
      .map((a) => a.finished.catch(() => {})),
  ))
}

async function shot(page, name) {
  fs.mkdirSync(SHOTS, { recursive: true })
  // Viewport only, on purpose: it is what a person sees without scrolling.
  await page.screenshot({ path: path.join(SHOTS, `${name}.png`) })
}

// The theme really applied: the heading's ink is dark on light and light on
// dark. Without it a theme that silently failed to switch would pass twice.
async function expectTheme(page, headingSel, theme) {
  const lum = await page.locator(headingSel).first().evaluate((el) => {
    // A 1px canvas turns whatever colour syntax the page resolved to into rgb.
    const c = document.createElement('canvas')
    c.width = c.height = 1
    const g2 = c.getContext('2d')
    g2.fillStyle = getComputedStyle(el).color
    g2.fillRect(0, 0, 1, 1)
    const [r, g, b] = g2.getImageData(0, 0, 1, 1).data
    return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255
  })
  if (theme === 'light') expect(lum, 'the heading is not dark ink on the light theme').toBeLessThan(0.4)
  else expect(lum, 'the heading is not light ink on the dark theme').toBeGreaterThan(0.6)
}

// Nothing wider than the viewport, and no visible control under 44px in either
// direction. An inline link inside a sentence is exempt (WCAG 2.5.8's inline
// exception), so it is skipped; every standalone link, button and field counts.
async function expectFitsAndTouchable(page, rootSel, what) {
  const r = await page.evaluate((sel) => {
    const root = document.querySelector(sel)
    const small = []
    let seen = 0
    for (const el of root.querySelectorAll('a[href],button,input:not([type=hidden]),select,textarea,summary,[role=button]')) {
      if (!el.getClientRects().length || getComputedStyle(el).visibility === 'hidden') continue
      if (el.tagName === 'A' && el.closest('p')) continue
      seen++
      const b = el.getBoundingClientRect()
      if (b.width < 44 || b.height < 44) small.push(`${el.tagName.toLowerCase()} "${(el.textContent || '').trim().slice(0, 30)}" ${Math.round(b.width)}x${Math.round(b.height)}`)
    }
    return { small, seen, scrollW: document.documentElement.scrollWidth, vw: window.innerWidth }
  }, rootSel)
  expect(r.seen, `${what}: found no controls to measure`).toBeGreaterThan(0)
  expect(r.small, `${what}: controls under 44px`).toEqual([])
  expect(r.scrollW, `${what}: the page scrolls sideways`).toBeLessThanOrEqual(r.vw)
}

for (const theme of THEMES) {
  for (const width of WIDTHS) {
    test.describe(`${width}px touch, ${theme}`, () => {
      test(`/onboarding signed in: the kit builder takes the theme, fits, and its ways out are 44px`, async ({ browser }) => {
        const { ctx, page } = await open(browser, { width, theme })
        watch(page, `a new account on onboarding at ${width}px, ${theme}`)
        await signIn(page, { plan: 'free', onboarded: false })
        await go(page, '/onboarding')
        await expect(page.locator('[data-h1]')).toBeVisible()
        await expect(page.locator('a[data-start][data-first-win]')).toHaveCount(2)
        await settle(page)
        await expectTheme(page, '[data-h1]', theme)

        // The ways out: "Not now", the two other starts and the pill are all real targets.
        for (const sel of ['a[data-skip]', 'a[data-first-win="type-scale"]', 'a[data-first-win="gradient"]', '[data-go]']) {
          const box = await page.locator(sel).boundingBox()
          expect(box.height, `${sel} is under 44px at ${width}px`).toBeGreaterThanOrEqual(44)
        }
        const sideways = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
        expect(sideways, 'the page scrolls sideways').toBeLessThanOrEqual(0)
        // The old outer card is gone, so nothing paints a panel behind the page.
        await expect(page.locator('.onb-card')).toHaveCount(0)

        await shot(page, `onboarding--in-${width}-${theme}`)
        await ctx.close()
      })

      // The V3 state card serves three states: /checkout signed out and signed in
      // with no plan (the invalid selection), and /checkout/return with no session.
      // The design has no alert icon; the heading carries the state.
      const CARD_STATES = [
        { name: '/checkout signed out', url: '/checkout', signedIn: false, shot: 'checkout', solo: true },
        { name: '/checkout signed in', url: '/checkout', signedIn: true, shot: 'checkout--in', solo: true },
        { name: '/checkout/return signed in, no session', url: '/checkout/return', signedIn: true, shot: 'checkout-return--in', solo: false },
      ]
      for (const st of CARD_STATES) {
        test(`${st.name}: the state card takes the theme, sits below the nav, fits and is touchable`, async ({ browser }) => {
          const { ctx, page } = await open(browser, { width, theme })
          watch(page, `a buyer on ${st.name} at ${width}px, ${theme}`)
          if (st.signedIn) await signIn(page, { plan: 'free' })
          await go(page, st.url)
          const card = page.locator('.ck-ret')
          await expect(card.getByRole('heading', { level: 1 })).toBeVisible()
          await settle(page)
          await expectTheme(page, '.ck-ret h1', theme)

          const m = await page.evaluate(() => {
            const card = document.querySelector('.ck-ret')
            const b = card.getBoundingClientRect()
            const nav = document.querySelector('nav.pnav')?.getBoundingClientRect()
            return {
              card: { x: b.x, w: b.width, top: b.top },
              navBottom: nav ? nav.bottom : null,
              // The old raw "!" glyph and its icon block are gone for good.
              glyph: [...card.querySelectorAll('*')].some((el) => !el.children.length && el.textContent.trim() === '!'),
              vw: window.innerWidth,
            }
          })
          expect(m.glyph, 'the card draws a raw "!" character').toBe(false)
          // MUTATION: drop the 560px max-width at 600px and up and the 768 card runs
          // the full container width, so this fails.
          expect(m.card.w, 'the card is wider than the 560px column').toBeLessThanOrEqual(560.5)
          expect(m.card.x, 'the card is pinned to the page edge').toBeGreaterThan(0)
          // MUTATION: set `.ck-ret { margin-top: 0 }` and the card butts the nav.
          expect(m.navBottom, 'the nav was not found to measure from').not.toBeNull()
          const gap = m.card.top - m.navBottom
          const want = width >= 600 ? (st.solo ? 48 : 96) : 24
          expect(gap, `the card is ${Math.round(gap)}px below the nav, not about ${want}px`).toBeGreaterThanOrEqual(want - 8)

          await expectFitsAndTouchable(page, 'main', `${st.name} at ${width}px ${theme}`)
          await shot(page, `${st.shot}-${width}-${theme}`)
          await ctx.close()
        })
      }
    })
  }
}
