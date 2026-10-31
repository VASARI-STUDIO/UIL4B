// Nav touch behaviour and labels (menus and nav soft redesign, slice 3).
//
// What this pins, at 390 (touch), 768 (touch) and 1440 (mouse):
//   · Hover styles apply only where a pointer can hover. A pointer over the phone
//     tab or the marketing icon button leaves it as it was on a touch screen; on
//     a mouse the same move still lights it (the control).
//   · The marketing quiet links (Tools / Pricing / On mobile) take a 44px touch
//     hit area on a coarse pointer, and nothing else about them changes: the
//     drawn boxes are the same as with a mouse, and a mouse gets no extra area.
//   · The Admin dashboard row in the account popover has a shield icon, sized and
//     aligned like its sibling rows, for the admin only.
//   · One name for /plans: "Pricing" in both menus and both footers, and the
//     settings row reads "Account and settings".
//   · The footer's Privacy / Terms / Credits links are shown once at every width:
//     in the baseline row up to 760px, as the LEGAL column from 761px. Both sit in
//     the page from the first render, so crossing the line moves nothing.
//
// The drawn quiet-link sizes are hand-checked (32px tall; 67, 82 and 98px wide at
// 10.5px mono, 0.14em tracking, 14px side padding), not read back from the
// stylesheet. They were also measured on the build before this slice.
import { test, expect } from './base.js'
import { go, signIn, watch } from './helpers.js'

const PHONE = { name: '390 touch', width: 390, height: 844, touch: true }
const TABLET = { name: '768 touch', width: 768, height: 1024, touch: true }
const DESKTOP = { name: '1440', width: 1440, height: 900, touch: false }

async function open(browser, size, persona) {
  const ctx = await browser.newContext({
    viewport: { width: size.width, height: size.height },
    hasTouch: size.touch,
    isMobile: size.touch,
  })
  const page = await ctx.newPage()
  watch(page, `${persona} at ${size.name}`)
  return { ctx, page }
}

// The alpha channel of a computed colour: "color(srgb 0.05 0.05 0.06 / 0.055)" or "rgba(a, b, c, 0.5)".
const alpha = (css) => {
  const m = /\/\s*([\d.]+)\s*\)/.exec(css) || /rgba\([^)]*,\s*([\d.]+)\)/.exec(css)
  return m ? Number(m[1]) : 1
}
const centre = async (loc) => {
  const b = await loc.boundingBox()
  return { x: b.x + b.width / 2, y: b.y + b.height / 2 }
}
const canHover = (page) => page.evaluate(() => matchMedia('(hover: hover)').matches)
const colour = (loc) => loc.evaluate((el) => getComputedStyle(el).color)
const fill = (loc) => loc.evaluate((el) => getComputedStyle(el).backgroundColor)

// ── 3a: hover only where a pointer can hover ─────────────────────────────────
test.describe('hover styles', () => {
  test('390 touch: a pointer over a phone tab does not ink it like the current tab', async ({ browser }) => {
    const { ctx, page } = await open(browser, PHONE, 'a phone visitor')
    await go(page, '/discover')
    expect(await canHover(page), 'POSITIVE CONTROL: this context can hover').toBe(false)
    const tab = page.locator('.pnav-tab:not(.is-current):not([aria-expanded="true"])').first()
    await expect(tab).toBeVisible()
    const rest = await colour(tab)
    const current = await colour(page.locator('.pnav-tab.is-current').first())
    expect(alpha(rest), 'the resting tab should be dimmer than the current one').toBeLessThan(alpha(current))
    const { x, y } = await centre(tab)
    await page.mouse.move(x, y)
    await page.waitForTimeout(250)
    expect(await tab.evaluate((el) => el.matches(':hover')), 'the pointer is not over the tab, so this proves nothing').toBe(true)
    expect(await colour(tab), 'a hover latched the tab to the current ink').toBe(rest)
    await ctx.close()
  })

  test('390 with a mouse: the same move does ink the tab (control)', async ({ browser }) => {
    const { ctx, page } = await open(browser, { ...PHONE, name: '390 mouse', touch: false }, 'a narrow desktop window')
    await go(page, '/discover')
    expect(await canHover(page)).toBe(true)
    const tab = page.locator('.pnav-tab:not(.is-current):not([aria-expanded="true"])').first()
    await expect(tab).toBeVisible()
    const rest = await colour(tab)
    const { x, y } = await centre(tab)
    await page.mouse.move(x, y)
    await expect.poll(async () => alpha(await colour(tab)), { message: 'a hover no longer inks the tab' }).toBeGreaterThan(alpha(rest))
    await ctx.close()
  })

  test('768 touch: a pointer over the theme button leaves its fill at the resting 5.5%', async ({ browser }) => {
    const { ctx, page } = await open(browser, TABLET, 'a tablet visitor')
    await go(page, '/')
    expect(await canHover(page), 'POSITIVE CONTROL: this context can hover').toBe(false)
    const icon = page.locator('.spnav-icon').first()
    await expect(icon).toBeVisible()
    expect(alpha(await fill(icon))).toBeCloseTo(0.055, 3)
    const { x, y } = await centre(icon)
    await page.mouse.move(x, y)
    await page.waitForTimeout(300)
    expect(await icon.evaluate((el) => el.matches(':hover')), 'the pointer is not over the button, so this proves nothing').toBe(true)
    expect(alpha(await fill(icon)), 'a hover latched the hover fill').toBeCloseTo(0.055, 3)
    await ctx.close()
  })

  test('1440 mouse: hovering the theme button fills it to 11% (control)', async ({ browser }) => {
    const { ctx, page } = await open(browser, DESKTOP, 'a desktop visitor')
    await go(page, '/')
    const icon = page.locator('.spnav-icon').first()
    await expect(icon).toBeVisible()
    await icon.hover()
    await expect.poll(async () => alpha(await fill(icon)), { message: 'a hover no longer fills the button' }).toBeCloseTo(0.11, 3)
    await ctx.close()
  })
})

// ── 3b: the quiet links' touch hit area ──────────────────────────────────────
const QUIET = ['Tools', 'Pricing', 'On mobile']

const quietBoxes = (page) => page.locator('.spnav-quiet-link').evaluateAll((els) => els.map((el) => {
  const r = el.getBoundingClientRect()
  return { text: el.textContent.trim(), x: r.x, y: r.y, w: r.width, h: r.height }
}))

// Which quiet link, if any, owns the point.
const ownerAt = (page, x, y) => page.evaluate(
  ([px, py]) => document.elementFromPoint(px, py)?.closest('.spnav-quiet-link')?.textContent.trim() ?? null,
  [x, y],
)

test.describe('quiet links', () => {
  test('768 touch: each link takes a 44px tall hit area and its drawn box is the one a mouse sees', async ({ browser }) => {
    const touch = await open(browser, TABLET, 'a tablet visitor')
    await go(touch.page, '/')
    expect(await touch.page.evaluate(() => matchMedia('(pointer: coarse)').matches), 'POSITIVE CONTROL: not a coarse pointer').toBe(true)
    const mouse = await open(browser, { ...TABLET, name: '768 mouse', touch: false }, 'a tablet-width desktop window')
    await go(mouse.page, '/')
    expect(await mouse.page.evaluate(() => matchMedia('(pointer: coarse)').matches)).toBe(false)

    const drawn = await quietBoxes(touch.page)
    const base = await quietBoxes(mouse.page)
    expect(drawn.map((b) => b.text)).toEqual(QUIET)
    drawn.forEach((b, i) => {
      expect(b.h, `${b.text} changed height`).toBe(32)
      // Each link is wider than the 44px target, so only its height grows and neighbouring areas never overlap.
      expect(b.w, `${b.text} is narrower than 44px`).toBeGreaterThan(44)
      // Layout is unchanged by the hit area: every edge matches the mouse layout.
      for (const k of ['x', 'y', 'w', 'h']) expect(b[k], `${b.text} ${k} moved on touch`).toBeCloseTo(base[i][k], 2)
    })

    for (const b of drawn) {
      const cx = b.x + b.w / 2
      const cy = b.y + b.h / 2
      expect(await ownerAt(touch.page, cx, cy - 21), `a tap 21px above ${b.text} misses it`).toBe(b.text)
      expect(await ownerAt(touch.page, cx, cy + 21), `a tap 21px below ${b.text} misses it`).toBe(b.text)
      expect(await ownerAt(touch.page, cx, cy - 25), `${b.text}'s area is taller than 44px`).toBeNull()
      expect(await ownerAt(touch.page, cx, cy + 25), `${b.text}'s area is taller than 44px`).toBeNull()
    }
    await touch.ctx.close()
    await mouse.ctx.close()
  })

  test('1440 mouse: the links get no extra area', async ({ browser }) => {
    const { ctx, page } = await open(browser, DESKTOP, 'a desktop visitor')
    await go(page, '/')
    const boxes = await quietBoxes(page)
    expect(boxes).toHaveLength(3)
    for (const b of boxes) {
      expect(b.h).toBe(32)
      expect(await ownerAt(page, b.x + b.w / 2, b.y + b.h / 2 - 21), `${b.text} has a touch area under a mouse`).toBeNull()
    }
    await ctx.close()
  })

  test('390 touch: the links are not drawn (the burger menu carries them)', async ({ browser }) => {
    const { ctx, page } = await open(browser, PHONE, 'a phone visitor')
    await go(page, '/')
    await expect(page.locator('.spnav-quiet-link').first()).toBeHidden()
    await ctx.close()
  })
})

// ── 3c / 3d: the Admin row and the labels ────────────────────────────────────
test.describe('account menu rows', () => {
  for (const size of [TABLET, DESKTOP]) {
    test(`an admin's Admin dashboard row has a shield icon laid out like its siblings, at ${size.name}`, async ({ browser }) => {
      const { ctx, page } = await open(browser, size, 'the founder')
      await signIn(page, { admin: true, projects: 1 })
      await go(page, '/discover')
      const trigger = page.locator('.pnav-avatar-btn')
      if (size.touch) await trigger.tap()
      else await trigger.click()
      const pop = page.locator('#pnav-account-pop')
      await expect(pop).toBeVisible()
      // Measure at rest: a popover mid-entrance is scaled and offset.
      await page.evaluate(() => Promise.all(document.getAnimations()
        .filter((a) => a.effect?.getComputedTiming().endTime !== Infinity)
        .map((a) => a.finished.catch(() => {}))))
      const admin = pop.getByRole('link', { name: 'Admin dashboard', exact: true })
      const settings = pop.getByRole('link', { name: 'Account and settings', exact: true })
      await expect(admin).toHaveAttribute('href', '/admin')
      const icon = admin.locator('svg')
      await expect(icon, 'the Admin dashboard row has no icon').toHaveCount(1)
      await expect(icon).toHaveAttribute('aria-hidden', 'true')
      await expect(icon).toHaveAttribute('width', '16')
      const ib = await icon.boundingBox()
      const sb = await settings.locator('svg').boundingBox()
      expect(ib.width, 'the icon is not the size of the other rows\' icons').toBeCloseTo(sb.width, 1)
      expect(ib.height).toBeCloseTo(sb.height, 1)
      expect(ib.x, 'the icon does not line up with the other rows\' icons').toBeCloseTo(sb.x, 1)
      const ab = await admin.boundingBox()
      const gb = await settings.boundingBox()
      expect(ab.height, 'the icon changed the row height').toBeCloseTo(gb.height, 1)
      // The label's text starts where the other rows' text does.
      const at = await admin.locator('span').boundingBox()
      const st = await settings.locator('span').boundingBox()
      expect(at.x).toBeCloseTo(st.x, 1)
      await ctx.close()
    })
  }

  test('a member who is not the admin sees no Admin dashboard row', async ({ browser }) => {
    const { ctx, page } = await open(browser, DESKTOP, 'a free member')
    await signIn(page, { projects: 1 })
    await go(page, '/discover')
    await page.locator('.pnav-avatar-btn').click()
    await expect(page.locator('#pnav-account-pop')).toBeVisible()
    await expect(page.getByRole('link', { name: 'Admin dashboard' })).toHaveCount(0)
    await ctx.close()
  })

  test('1440: the popover says "Account and settings" (signed in) and "Pricing" (signed out)', async ({ browser }) => {
    const member = await open(browser, DESKTOP, 'a free member')
    await signIn(member.page, { projects: 1 })
    await go(member.page, '/discover')
    await member.page.locator('.pnav-avatar-btn').click()
    const pop = member.page.locator('#pnav-account-pop')
    await expect(pop.getByRole('link', { name: 'Account and settings', exact: true })).toHaveAttribute('href', '/settings')
    await expect(pop).not.toContainText('Account & settings')
    await member.ctx.close()

    const visitor = await open(browser, DESKTOP, 'a signed-out visitor')
    await go(visitor.page, '/discover')
    await visitor.page.locator('.pnav-more').click()
    const out = visitor.page.locator('#pnav-account-pop')
    await expect(out.getByRole('link', { name: 'Pricing', exact: true })).toHaveAttribute('href', '/plans')
    await expect(out).not.toContainText('Pricing & plans')
    await visitor.ctx.close()
  })

  test('390: the phone sheet says "Pricing" (signed out) and "Account and settings" (signed in)', async ({ browser }) => {
    const visitor = await open(browser, PHONE, 'a signed-out visitor')
    await go(visitor.page, '/create/palette')
    await visitor.page.locator('.pnav-mobile').tap()
    const sheet = visitor.page.locator('.pnav-sheet')
    await expect(sheet).toBeVisible()
    await expect(sheet.getByRole('link', { name: 'Pricing', exact: true })).toHaveAttribute('href', '/plans')
    await expect(sheet).not.toContainText('Pricing & plans')
    await visitor.ctx.close()

    const member = await open(browser, PHONE, 'a free member')
    await signIn(member.page, { projects: 1 })
    await go(member.page, '/create/palette')
    await member.page.locator('.pnav-mobile').tap()
    const memberSheet = member.page.locator('.pnav-sheet')
    await expect(memberSheet.getByRole('link', { name: 'Account and settings', exact: true })).toHaveAttribute('href', '/settings')
    await expect(memberSheet).not.toContainText('Account & settings')
    await member.ctx.close()
  })
})

// ── 3d: both footers name /plans "Pricing" ───────────────────────────────────
for (const size of [PHONE, TABLET, DESKTOP]) {
  test.describe(`footers at ${size.name}`, () => {
    test('the marketing footer links /plans as Pricing, and no link is called Plans', async ({ browser }) => {
      const { ctx, page } = await open(browser, size, 'a visitor at the foot of the front page')
      await go(page, '/')
      const footer = page.locator('footer.sp-footer')
      await footer.scrollIntoViewIfNeeded()
      await expect(footer.locator('a[href="/plans"]')).toHaveText('Pricing')
      await expect(footer.getByRole('link', { name: 'Plans', exact: true })).toHaveCount(0)
      await ctx.close()
    })

    test('the reading-page footer links /plans as Pricing, and no link is called Plans', async ({ browser }) => {
      const { ctx, page } = await open(browser, size, 'a visitor at the foot of a reading page')
      await go(page, '/privacy')
      const footer = page.locator('footer.app-footer')
      await footer.scrollIntoViewIfNeeded()
      await expect(footer.locator('a[href="/plans"]')).toHaveText('Pricing')
      await expect(footer.getByRole('link', { name: 'Plans', exact: true })).toHaveCount(0)
      await ctx.close()
    })
  })
}

// ── 3e: the legal links, once at every width ─────────────────────────────────
const LEGAL = [['Privacy', '/privacy'], ['Terms', '/terms'], ['Credits', '/credits']]
const WIDTHS = [
  { width: 390, inColumn: false, groups: 3 },
  { width: 760, inColumn: false, groups: 3 },
  { width: 761, inColumn: true, groups: 4 },
  { width: 768, inColumn: true, groups: 4 },
  { width: 1440, inColumn: true, groups: 4 },
]

for (const w of WIDTHS) {
  const touch = w.width <= 768
  test(`front page at ${w.width}: Privacy, Terms and Credits are shown once, in the ${w.inColumn ? 'LEGAL column' : 'baseline row'}`, async ({ browser }) => {
    const { ctx, page } = await open(browser, { name: String(w.width), width: w.width, height: 900, touch }, 'a visitor reading the footer')
    await go(page, '/')
    const footer = page.locator('footer.sp-footer')
    await footer.scrollIntoViewIfNeeded()
    const keep = w.inColumn ? '.sp-footer-col--legal' : '.sp-footer-legal-links'
    const drop = w.inColumn ? '.sp-footer-legal-links' : '.sp-footer-col--legal'
    for (const [name, href] of LEGAL) {
      // Both are in the page, which is what lets CSS choose without a re-render.
      await expect(footer.locator(`a[href="${href}"]`), `${name} should be in the page twice`).toHaveCount(2)
      // For a person, and for a screen reader, it is there once.
      await expect(footer.getByRole('link', { name, exact: true }), `${name} should be reachable once`).toHaveCount(1)
      await expect(footer.locator(`${keep} a[href="${href}"]`)).toBeVisible()
      await expect(footer.locator(`${drop} a[href="${href}"]`)).toBeHidden()
    }
    await expect(footer.getByRole('navigation', { name: 'Legal' })).toHaveCount(w.inColumn ? 0 : 1)
    const groups = await footer.locator('.sp-footer-col').evaluateAll((cols) => cols.filter((c) => c.getClientRects().length > 0).length)
    expect(groups, `${w.width}px should draw ${w.groups} link groups`).toBe(w.groups)
    if (w.inColumn) await expect(footer.locator('.sp-footer-col--legal .sp-footer-col-h')).toHaveText('LEGAL')
    await ctx.close()
  })
}

// Nothing in the footer's link markup changes after it first appears, at either
// side of the 760/761 line, and its height is the same once it has settled.
for (const width of [760, 761]) {
  test(`front page at ${width}: the footer's links and height do not change after it first appears`, async ({ browser }) => {
    const { ctx, page } = await open(browser, { name: String(width), width, height: 900, touch: false }, 'a visitor loading the front page')
    await page.addInitScript(() => {
      const state = { first: null, linkChanges: 0 }
      window.__footerWatch = state
      new MutationObserver((records) => {
        const f = document.querySelector('footer.sp-footer')
        if (!f || !f.querySelector('a[href="/privacy"]')) return
        if (!state.first) {
          state.first = { links: f.querySelectorAll('a[href="/privacy"]').length, height: f.getBoundingClientRect().height }
          return
        }
        for (const r of records) {
          for (const n of [...r.addedNodes, ...r.removedNodes]) {
            if (n.nodeType === 1 && (n.matches?.('a, li, nav, .sp-footer-col') || n.querySelector?.('a'))) state.linkChanges++
          }
        }
      }).observe(document, { childList: true, subtree: true })
    })
    await go(page, '/')
    await page.locator('footer.sp-footer').scrollIntoViewIfNeeded()
    await page.waitForTimeout(800)
    const seen = await page.evaluate(() => {
      const f = document.querySelector('footer.sp-footer')
      return { ...window.__footerWatch, links: f.querySelectorAll('a[href="/privacy"]').length, height: f.getBoundingClientRect().height }
    })
    expect(seen.first, 'the footer was never seen to appear').not.toBeNull()
    expect(seen.first.links, 'the footer did not start with both legal sets').toBe(2)
    expect(seen.links).toBe(2)
    expect(seen.linkChanges, 'footer links were added or removed after the first render').toBe(0)
    expect(seen.height, 'the footer changed height after it first appeared').toBeCloseTo(seen.first.height, 0)
    await ctx.close()
  })
}
