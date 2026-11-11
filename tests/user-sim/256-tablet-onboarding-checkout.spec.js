// /onboarding and /checkout (and /checkout/return) on a phone and a tablet.
//
// THE ROUTE SWEEP FOUND
//   /onboarding at 768: the three option rows sat inside an outer card (a card
//     in a card), and "Not now, take me to my projects" turned into a bare text
//     link about 20px tall.
//   /checkout: the invalid-selection state drew a raw "!" character where
//     /checkout/return draws an icon, hugged the top-left of the page, and at
//     768 left a 520px card with dead space on its right.
//
// WHAT THIS PINS
//   Onboarding, signed in: no bordered box wraps the rows (at either width); from
//     521px the rows are 560px, centred, hairline-bordered and unfilled; "Not now"
//     is a 48px bordered pill at both widths.
//   Checkout: the alert icon is a drawn 24px svg in the error tone, not a text
//     glyph; the card is a centred column (up to 480px) with balanced margins; it
//     sits about 15vh below the nav, not pinned to the top.
//   Checkout return, no session: the alert icon is a drawn svg in the error tone;
//     the column (up to 600px, no card) is centred with balanced margins.
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
      test(`/onboarding signed in: rows on the ground, no card in a card, a 48px Not now pill`, async ({ browser }) => {
        const { ctx, page } = await open(browser, { width, theme })
        watch(page, `a new account on onboarding at ${width}px, ${theme}`)
        await signIn(page, { plan: 'free', onboarded: false })
        await go(page, '/onboarding')
        await expect(page.locator('[data-first-win]')).toHaveCount(3)
        await settle(page)
        await expectTheme(page, '.onb-q', theme)

        const m = await page.evaluate(() => {
          const box = (el) => { const b = el.getBoundingClientRect(); return { x: b.x, w: b.width, h: b.height } }
          const paint = (el) => {
            const s = getComputedStyle(el)
            const bg = s.backgroundColor.match(/[\d.]+/g).map(Number)
            return {
              fill: bg.length === 4 ? bg[3] > 0 : true,
              border: parseFloat(s.borderTopWidth),
              shadow: s.boxShadow !== 'none',
              radius: parseFloat(s.borderTopLeftRadius),
            }
          }
          const rows = [...document.querySelectorAll('[data-first-win]')]
          // Every ancestor of a row, up to the page, that draws itself as a box.
          const boxedAncestors = []
          for (const row of rows) {
            for (let el = row.parentElement; el && el !== document.body; el = el.parentElement) {
              const p = paint(el)
              if (p.border > 0 || p.shadow) boxedAncestors.push(`${el.tagName.toLowerCase()}.${el.className}`)
            }
          }
          const back = document.querySelector('.onb-back')
          return {
            vw: window.innerWidth,
            boxedAncestors,
            cardFill: paint(document.querySelector('.onb-card')).fill,
            rows: rows.map((r) => ({ ...box(r), ...paint(r) })),
            back: { ...box(back), ...paint(back) },
          }
        })

        // MUTATION: put the `.onb-card` panel back in global.css (a `border:1px
        // solid var(--border)`, a `padding`, a `var(--card)` background) and this
        // fails, naming the box that wraps the rows.
        expect(m.boxedAncestors, 'a bordered or shadowed box wraps the option rows (card in a card)').toEqual([])
        expect(m.cardFill, 'the onboarding card still paints a fill behind the rows').toBe(false)

        expect(m.rows).toHaveLength(3)
        for (const r of m.rows) {
          expect(r.border, 'a row lost its hairline border').toBe(1)
          expect(r.h, 'a row is not the existing ~76px height').toBeGreaterThanOrEqual(72)
          // The phone's rows can run taller when a blurb wraps; the 76px spec is the tablet's.
          if (width >= 768) expect(r.h).toBeLessThanOrEqual(84)
        }

        if (width >= 768) {
          // MUTATION: delete `@media(min-width:521px){.onb-firstwin-option{background:transparent}}`
          // from global.css and the rows take the card fill again, so this fails.
          for (const r of m.rows) expect(r.fill, 'a tablet row is filled; it should sit on the page ground').toBe(false)
          // MUTATION: set `.onb-card` back to `max-width:640px` and the column is
          // 640px, not 560px, so this fails.
          for (const r of m.rows) expect(Math.abs(r.w - 560), 'the option column is not 560px').toBeLessThanOrEqual(1)
        } else {
          for (const r of m.rows) expect(r.fill, 'the phone rows lost their card fill, which was to stay as it is').toBe(true)
        }

        // Centred: equal margins left and right, on every row and on the pill.
        for (const r of [...m.rows, m.back]) {
          expect(Math.abs(r.x - (m.vw - r.x - r.w)), 'the column is not centred (unbalanced margins)').toBeLessThanOrEqual(1.5)
        }

        // MUTATION: put `.onb-back` back to `min-height:44px; border:none; padding:0;
        // display:inline-flex` and "Not now" is a 44px, unbordered, text-width link,
        // so the height, the border and the full-width checks all fail.
        expect(Math.abs(m.back.h - 48), '"Not now" is not 48px tall').toBeLessThanOrEqual(0.5)
        expect(m.back.border, '"Not now" lost its border, so it is a bare text link').toBe(1)
        expect(m.back.radius, '"Not now" is not a pill').toBeGreaterThanOrEqual(24)
        expect(Math.abs(m.back.w - m.rows[0].w), '"Not now" is not as wide as the option column').toBeLessThanOrEqual(1)

        await expectFitsAndTouchable(page, '.onb', `onboarding at ${width}px ${theme}`)
        await shot(page, `onboarding--in-${width}-${theme}`)
        await ctx.close()
      })

      // The same card serves two states: /checkout signed out and /checkout signed
      // in. The return page is a column without a card and has its own test below.
      const CHECKOUT_STATES = [
        { name: '/checkout signed out', url: '/checkout', signedIn: false, shot: 'checkout' },
        { name: '/checkout signed in', url: '/checkout', signedIn: true, shot: 'checkout--in' },
      ]
      for (const st of CHECKOUT_STATES) {
        test(`${st.name}: drawn alert icon, a centred column about 15vh below the nav`, async ({ browser }) => {
          const { ctx, page } = await open(browser, { width, theme })
          watch(page, `a buyer on ${st.name} at ${width}px, ${theme}`)
          if (st.signedIn) await signIn(page, { plan: 'free' })
          await go(page, st.url)
          const card = page.locator('.checkout-return-card')
          await expect(card.getByRole('heading', { level: 1 })).toBeVisible()
          await settle(page)
          await expectTheme(page, '.checkout-return-card h1', theme)

          const m = await page.evaluate(() => {
            const icon = document.querySelector('.checkout-return-card .checkout-error-icon')
            const svg = icon?.querySelector('svg')
            // The error tone as the page resolves it, read through a probe so the
            // test follows the token rather than a hex that drifts.
            const probe = document.createElement('span')
            probe.style.color = 'var(--err-strong)'
            document.body.append(probe)
            const tone = getComputedStyle(probe).color
            probe.remove()
            const body = document.querySelector('.checkout-return-card').getBoundingClientRect()
            const nav = document.querySelector('nav.pnav')?.getBoundingClientRect()
            return {
              hasIcon: !!icon,
              svg: svg ? { w: svg.getBoundingClientRect().width, h: svg.getBoundingClientRect().height, color: getComputedStyle(svg).color, shapes: svg.querySelectorAll('circle,line,path').length } : null,
              glyphText: (icon?.textContent || '').trim(),
              tone,
              card: { x: body.x, w: body.width, top: body.top },
              navBottom: nav ? nav.bottom : null,
              vw: window.innerWidth,
              vh: window.innerHeight,
            }
          })

          // MUTATION: put `<div className="checkout-error-icon" aria-hidden="true">!</div>`
          // back in Checkout.jsx and the svg is gone and the glyph text is "!", so
          // these fail (the /checkout/return case fails if its svg is removed).
          expect(m.hasIcon, 'the state has no alert icon block').toBe(true)
          expect(m.svg, 'the alert icon is not a drawn svg').not.toBeNull()
          expect(m.glyphText, 'the alert icon is still a text character').toBe('')
          expect(m.svg.shapes, 'the drawn icon has no shapes').toBeGreaterThan(0)
          // MUTATION: change the svg width/height, or the `.checkout-error-icon svg`
          // rule in checkout.css, to 28px or 30px and this fails.
          expect(Math.round(m.svg.w), 'the alert icon is not 24px wide').toBe(24)
          expect(Math.round(m.svg.h), 'the alert icon is not 24px tall').toBe(24)
          expect(m.svg.color, 'the alert icon is not in the error tone').toBe(m.tone)

          // MUTATION: put `.checkout-return { justify-content: flex-start }` back in
          // checkout.css and the card hugs the left, so the margins differ by far more than 1px.
          const left = m.card.x
          const right = m.vw - m.card.x - m.card.w
          expect(Math.abs(left - right), 'the card is not centred (unbalanced margins)').toBeLessThanOrEqual(1.5)
          expect(left, 'the card is pinned to the page edge').toBeGreaterThan(0)
          // MUTATION: put the card's `max-width` back to 520px and the 768 card is
          // 520px, so this fails.
          expect(m.card.w, 'the card is wider than the 480px column').toBeLessThanOrEqual(480.5)
          if (width >= 768) expect(Math.abs(m.card.w - 480), 'the tablet card is not the 480px column').toBeLessThanOrEqual(1)

          // MUTATION: put `.checkout-return`'s top padding back to 8px and the card
          // sits at the top of the page, so the gap falls far under 13% of the height.
          expect(m.navBottom, 'the nav was not found to measure from').not.toBeNull()
          const gap = (m.card.top - m.navBottom) / m.vh
          expect(gap, `the card is ${(gap * 100).toFixed(1)}vh below the nav, not about 15vh`).toBeGreaterThanOrEqual(0.13)
          expect(gap, `the card is ${(gap * 100).toFixed(1)}vh below the nav, not about 15vh`).toBeLessThanOrEqual(0.2)

          await expectFitsAndTouchable(page, 'main', `${st.name} at ${width}px ${theme}`)
          await shot(page, `${st.shot}-${width}-${theme}`)
          await ctx.close()
        })
      }

      test(`/checkout/return signed in, no session: drawn alert icon, a centred column, nothing under 44px`, async ({ browser }) => {
        const { ctx, page } = await open(browser, { width, theme })
        watch(page, `a buyer on /checkout/return with no session at ${width}px, ${theme}`)
        await signIn(page, { plan: 'free' })
        await go(page, '/checkout/return')
        const view = page.locator('.co-return')
        await expect(view.getByRole('heading', { level: 1 })).toBeVisible()
        await settle(page)
        await expectTheme(page, '.co-return h1', theme)

        const m = await page.evaluate(() => {
          const icon = document.querySelector('.co-return .co-alert')
          const probe = document.createElement('span')
          probe.style.color = 'var(--err-strong)'
          document.body.append(probe)
          const tone = getComputedStyle(probe).color
          probe.remove()
          const col = document.querySelector('.co-return').getBoundingClientRect()
          return {
            svg: icon ? { w: icon.getBoundingClientRect().width, color: getComputedStyle(icon).color, shapes: icon.querySelectorAll('circle,line,path').length } : null,
            glyphText: (document.querySelector('.co-return .co-glyph')?.textContent || '').trim(),
            tone,
            col: { x: col.x, w: col.width },
            vw: window.innerWidth,
          }
        })

        // MUTATION: swap `.co-alert` for a text "!" in CheckoutReturn.jsx and the svg is gone.
        expect(m.svg, 'the alert icon is not a drawn svg').not.toBeNull()
        expect(m.glyphText, 'the alert icon is still a text character').toBe('')
        expect(m.svg.shapes, 'the drawn icon has no shapes').toBeGreaterThan(0)
        expect(m.svg.color, 'the alert icon is not in the error tone').toBe(m.tone)
        // MUTATION: put `.co-return { margin-inline: auto }` back to 0 and the
        // column hugs the left at 768, so the margins differ by far more than 1px.
        const left = m.col.x
        const right = m.vw - m.col.x - m.col.w
        expect(Math.abs(left - right), 'the column is not centred (unbalanced margins)').toBeLessThanOrEqual(1.5)
        expect(m.col.w, 'the column is wider than 600px').toBeLessThanOrEqual(600.5)

        await expectFitsAndTouchable(page, 'main', `/checkout/return at ${width}px ${theme}`)
        await shot(page, `checkout-return--in-${width}-${theme}`)
        await ctx.close()
      })
    })
  }
}
