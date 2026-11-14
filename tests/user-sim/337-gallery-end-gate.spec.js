// The shared end gate (components/library/GalleryEndGate) closes every public
// gallery for a signed-out viewer, and each one behaves the same way:
//
//   - a real heading names the section (h2, the section's aria-labelledby);
//   - Log in and See the plans are both there, except on icon groups, which are
//     the deliberate exception: a free account opens no more groups, so they
//     offer Pro only and have no Log in;
//   - Log in opens sign-in, the plans link goes to /plans;
//   - the focus order is the heading, then Log in, then the plans link (the
//     faded rows above are inert and are never a stop);
//   - no locked asset is requested to draw the gate or its faded rows;
//   - nothing scrolls sideways at 320;
//   - the numbers in the heading and body are the data's, not typed.
//
// The expected words are worked out here by hand from the tier caps and the
// data files, not read back from src/data/galleryGateCopy.js.
//
// To see it fail: change the heading in GalleryEndGate.jsx (for example render
// `{heading}` as a <p>, or drop the Heading element) and the heading tests go red.
import { test, expect } from './base.js'
import { go, watch } from './helpers.js'
import { ICONIFY_HOSTS } from './iconify-stub.js'
import { LIBRARY_PALETTES } from '../../api/_lib/library/data.js'
import { GALLERY_GRADIENTS } from '../../api/_lib/library/data.js'
import { withProIcons } from '../../src/data/iconGroups.js'
import { resolveLibrary } from '../../api/_lib/library/load.js'
import { GALLERY_TIER_LIMITS } from '../../src/utils/lockedPreview.js'
import { tierOf } from '../../src/data/iconPackTiers.js'

// The groups with the Pro lists the library serves (the same resolver the API mock uses).
const GROUPS = withProIcons((await resolveLibrary()).PRO_ICON_GROUPS)

const FREE_GROUPS = GROUPS.filter((g) => g.access === 'free')
const PRO_GROUPS = GROUPS.filter((g) => g.access === 'pro')
const FREE_REFS = new Set(FREE_GROUPS.flatMap((g) => g.icons))
const PRO_ONLY_REFS = new Set(PRO_GROUPS.flatMap((g) => g.icons).filter((r) => !FREE_REFS.has(r)))

const GALLERIES = [
  {
    key: 'icons', route: '/create/icons', kind: 'anon', login: true,
    heading: /^Log in to access [\d,]+ icons$/,
    body: /^You're seeing [\d,]+ icons from 5 sets\. A free account opens every icon across \d+ sets\./,
    ready: (page) => expect(page.locator('.ig .ic').first()).toBeVisible({ timeout: 20000 }),
  },
  {
    key: 'palettes', route: '/discover/palettes', kind: 'anon', login: true,
    heading: `Log in to access ${GALLERY_TIER_LIMITS.free} palettes`,
    body: `You're seeing ${GALLERY_TIER_LIMITS.anonymous} of the ${LIBRARY_PALETTES.length} palettes. A free account opens ${GALLERY_TIER_LIMITS.free}; Pro opens all ${LIBRARY_PALETTES.length}.`,
    ready: (page) => expect(page.locator('.pgal-card:not(.geg-fade *)')).toHaveCount(GALLERY_TIER_LIMITS.anonymous),
  },
  {
    key: 'gradients', route: '/discover/gradients', kind: 'anon', login: true,
    heading: `Log in to access ${GALLERY_TIER_LIMITS.free} gradients`,
    body: `You're seeing ${GALLERY_TIER_LIMITS.anonymous} of the ${GALLERY_GRADIENTS.length} gradients. A free account opens ${GALLERY_TIER_LIMITS.free}; Pro opens all ${GALLERY_GRADIENTS.length}.`,
    ready: (page) => expect(page.locator('.grg-card:not(.geg-fade *)')).toHaveCount(GALLERY_TIER_LIMITS.anonymous),
  },
  {
    // The exception: logging in opens no more groups, so Pro is the only offer.
    key: 'icon groups', route: '/create/icons/groups', kind: 'pro', login: false,
    heading: `Pro opens ${PRO_GROUPS.length} more icon groups`,
    body: `You're seeing ${FREE_GROUPS.length} of the ${GROUPS.length} icon groups. Pro opens the remaining ${PRO_GROUPS.length}.`,
    ready: (page) => expect(page.locator('.igp-cards a.igp-card:not(.geg-fade *)')).toHaveCount(FREE_GROUPS.length, { timeout: 15000 }),
  },
]

/** Every request this page makes, as a URL string. */
function watchRequests(page) {
  const urls = []
  page.on('request', (req) => urls.push(req.url()))
  return urls
}

async function openGate(page, g, width = 1440) {
  await page.setViewportSize({ width, height: width <= 390 ? 844 : 900 })
  await go(page, g.route)
  await g.ready(page)
  const gate = page.locator(`.geg[data-gate="${g.kind}"]`)
  await expect(gate).toHaveCount(1)
  await gate.scrollIntoViewIfNeeded()
  await expect(gate).toBeVisible()
  return gate
}

for (const g of GALLERIES) {
  test.describe(`${g.key}: the shared end gate, signed out`, () => {
    test('has a real heading that names the section, with the data\'s counts', async ({ page }) => {
      watch(page, `a signed-out visitor at the end of the ${g.key} gallery`)
      const gate = await openGate(page, g)
      const heading = gate.getByRole('heading', { level: 2 })
      await expect(heading).toHaveCount(1)
      if (typeof g.heading === 'string') await expect(heading).toHaveText(g.heading)
      else await expect(heading).toHaveText(g.heading)
      // The section is named by that very heading.
      const labelled = await gate.evaluate((el) => document.getElementById(el.getAttribute('aria-labelledby'))?.tagName)
      expect(labelled, 'the gate is not labelled by an h2').toBe('H2')
      const body = gate.locator('.geg-p')
      if (typeof g.body === 'string') await expect(body).toHaveText(g.body)
      else await expect(body).toHaveText(g.body)
      if (g.key === 'icons') {
        // The count the body quotes is the number of icons actually drawn.
        const drawn = await page.locator('.ig .ic').count()
        const quoted = Number((await body.innerText()).match(/seeing ([\d,]+) icons/)[1].replace(/,/g, ''))
        expect(quoted).toBe(drawn)
      }
    })

    test('offers the right controls', async ({ page }) => {
      watch(page, `a signed-out visitor reading the ${g.key} gate`)
      const gate = await openGate(page, g)
      const login = gate.getByRole('button', { name: 'Log in' })
      if (g.login) {
        await expect(login).toBeVisible()
        await expect(gate.getByRole('link', { name: 'See the plans' })).toHaveAttribute('href', '/plans')
        await expect(gate.locator('a:not(.geg-fade *), button:not(.geg-fade *)')).toHaveCount(2)
      } else {
        await expect(login, 'a free account opens no more groups, so there is no Log in').toHaveCount(0)
        await expect(gate.getByRole('link', { name: 'See what Pro includes' })).toHaveAttribute('href', '/plans')
        await expect(gate.locator('a:not(.geg-fade *), button:not(.geg-fade *)')).toHaveCount(1)
      }
    })

    if (g.login) {
      test('Log in opens sign-in', async ({ page }) => {
        watch(page, `a signed-out visitor choosing Log in on ${g.key}`)
        const gate = await openGate(page, g)
        await gate.getByRole('button', { name: 'Log in' }).click()
        await expect(page.locator('[role="dialog"]')).toBeVisible()
        await expect(page).toHaveURL(new RegExp(`${g.route.replace(/\//g, '\\/')}$`))
      })
    }

    test('the plans link goes to /plans', async ({ page }) => {
      watch(page, `a signed-out visitor choosing the plans on ${g.key}`)
      const gate = await openGate(page, g)
      await gate.getByRole('link', { name: g.login ? 'See the plans' : 'See what Pro includes' }).click()
      await expect(page).toHaveURL(/\/plans$/)
    })

    test('focus goes heading, then Log in, then the plans', async ({ page }) => {
      watch(page, `a keyboard visitor tabbing through the ${g.key} gate`)
      const gate = await openGate(page, g)
      const heading = gate.getByRole('heading', { level: 2 })
      // The heading is not a tab stop; put the caret on it the way a screen
      // reader's cursor would, then Tab on from there.
      await heading.evaluate((el) => { el.setAttribute('tabindex', '-1'); el.focus() })
      await expect(heading).toBeFocused()
      const names = []
      const stops = g.login ? 2 : 1
      for (let i = 0; i < stops; i++) {
        await page.keyboard.press('Tab')
        names.push(await page.evaluate(() => (document.activeElement?.textContent || '').trim()))
        expect(await page.evaluate(() => !!document.activeElement.closest('.geg-fade')), 'focus landed in the inert faded rows').toBe(false)
      }
      expect(names).toEqual(g.login ? ['Log in', 'See the plans'] : ['See what Pro includes'])
      // And the document order agrees: heading, then the first control, then the second.
      const ordered = await gate.evaluate((el) => {
        const els = [el.querySelector('.geg-h'), ...el.querySelectorAll('.geg-pill, .geg-link')]
        return els.every((n, i) => i === 0 || !!(els[i - 1].compareDocumentPosition(n) & Node.DOCUMENT_POSITION_FOLLOWING))
      })
      expect(ordered).toBe(true)
    })

    test('no locked asset is requested to draw the gate', async ({ page }) => {
      watch(page, `a signed-out visitor, with requests captured, on ${g.key}`)
      const urls = watchRequests(page)
      const asked = []
      page.on('request', (req) => {
        const u = new URL(req.url())
        if (u.hostname !== ICONIFY_HOSTS[0] || !u.searchParams.has('icons')) return
        const pack = u.pathname.replace(/^\//, '').replace(/\.json$/, '')
        for (const n of (u.searchParams.get('icons') || '').split(',').filter(Boolean)) asked.push(`${pack}:${n}`)
      })
      const gate = await openGate(page, g)
      await page.waitForLoadState('networkidle')
      // Positive control: the faded rows exist, so "nothing requested" is about something.
      expect(await gate.locator('.geg-fade *').count(), 'no faded rows - this check would be vacuous').toBeGreaterThan(3)
      // The faded rows are neutral shapes: no picture, so nothing to fetch (the icon library's own rows draw its open sets).
      if (g.key !== 'icons') expect(await gate.locator('.geg-fade img').count(), 'a faded row loads a picture').toBe(0)
      // A real Pro asset is never reached (stand-ins live under /locked-images/).
      const real = urls.filter((u) => /\/(previews|export-themes)\//.test(u) && !/\/locked-images\//.test(u))
      expect(real, 'a real Pro preview was requested').toEqual([])
      if (g.key === 'icon groups') expect(asked.filter((r) => PRO_ONLY_REFS.has(r)), 'a Pro group icon was requested').toEqual([])
      // Icons: only the open sets are fetched, never a pack a free account or Pro adds.
      if (g.key === 'icons') {
        expect(asked.length, 'no icon request seen - this check would be vacuous').toBeGreaterThan(0)
        expect([...new Set(asked.map((r) => r.split(':')[0]))].filter((p) => tierOf(p) !== 'anon'), 'a locked set was requested').toEqual([])
      }
    })

    test('nothing scrolls sideways at 320', async ({ page }) => {
      watch(page, `a signed-out visitor on a 320px phone at the end of ${g.key}`)
      const gate = await openGate(page, g, 320)
      const m = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }))
      expect(m.sw, `the page is ${m.sw}px wide in a ${m.cw}px window`).toBeLessThanOrEqual(m.cw)
      const box = await gate.boundingBox()
      expect(box.x).toBeGreaterThanOrEqual(0)
      expect(box.x + box.width).toBeLessThanOrEqual(m.cw + 0.5)
      for (const sel of ['.geg-h', '.geg-p', '.geg-pill']) {
        const b = await gate.locator(sel).first().boundingBox()
        expect(b.x, `${sel} starts left of the screen`).toBeGreaterThanOrEqual(-0.5)
        expect(b.x + b.width, `${sel} runs off the right edge`).toBeLessThanOrEqual(m.cw + 0.5)
      }
    })
  })
}

// ── The faded cards are the gallery's own, on its grid ──────────────────────
// To see these fail: render the fade in a grid of its own with another column
// template (the 390px gradient fade goes back to one column), or put a Pro
// palette into the stand-ins.
const FADED = [
  { key: 'palettes', route: '/discover/palettes', card: '.pgal-card', free: LIBRARY_PALETTES.filter((p) => p.pro !== true).slice(GALLERY_TIER_LIMITS.anonymous, GALLERY_TIER_LIMITS.free) },
  { key: 'gradients', route: '/discover/gradients', card: '.grg-card', free: GALLERY_GRADIENTS.slice(GALLERY_TIER_LIMITS.anonymous, GALLERY_TIER_LIMITS.free) },
]

for (const f of FADED) {
  test.describe(`${f.key}: the faded cards behind the signed-out gate`, () => {
    test('are the next free-tier items, hidden from assistive tech and inert', async ({ page }) => {
      watch(page, `a signed-out visitor at the end of ${f.key}`)
      await page.setViewportSize({ width: 1440, height: 900 })
      await go(page, f.route)
      await expect(page.locator(`${f.card}:not(.geg-fade *)`)).toHaveCount(GALLERY_TIER_LIMITS.anonymous)
      const fade = page.locator('.geg[data-gate="anon"] .geg-fade')
      await expect(fade).toHaveAttribute('aria-hidden', 'true')
      await expect(fade).toHaveAttribute('inert', '')
      const names = (await fade.locator('.lbry-card-name').allInnerTexts()).map((n) => n.trim())
      expect(names.length, 'no faded cards - this check would be vacuous').toBeGreaterThan(0)
      const real = new Set(f.free.map((r) => r.name))
      expect(names.filter((n) => !real.has(n)), 'a faded card is not a free-tier item').toEqual([])
      // Nothing inside is a tab stop: focusing a control in the fade leaves focus where it was.
      const reached = await fade.evaluate((el) => [...el.querySelectorAll('a, button')].some((c) => { c.focus(); return document.activeElement === c }))
      expect(reached, 'a faded control took focus').toBe(false)
    })

    for (const width of [390, 1440]) {
      test(`sit on the live grid's edges at ${width}`, async ({ page }) => {
        watch(page, `a signed-out visitor at ${width}px on ${f.key}`)
        await page.setViewportSize({ width, height: width < 800 ? 844 : 900 })
        await go(page, f.route)
        await expect(page.locator(`${f.card}:not(.geg-fade *)`)).toHaveCount(GALLERY_TIER_LIMITS.anonymous)
        const edges = (sel) => page.locator(sel).evaluateAll((els) => [...new Set(els.flatMap((e) => { const r = e.getBoundingClientRect(); return [Math.round(r.left * 2) / 2, Math.round(r.right * 2) / 2] }))])
        const live = await edges(`${f.card}:not(.geg-fade *)`)
        const faded = await edges(`.geg-fade ${f.card}`)
        expect(faded.length, 'no faded cards').toBeGreaterThan(1)
        for (const e of live) expect(faded, `a live card edge at ${e} is missing from the faded cards`).toContain(e)
        for (const e of faded) expect(live.some((l) => Math.abs(l - e) <= 0.5) || e > Math.max(...live), `a faded edge at ${e} is off the live grid`).toBe(true)
      })
    }
  })
}
