// The shared end gate (components/library/GalleryEndGate) closes every public
// gallery for a signed-out viewer, and each one behaves the same way:
//
//   - a real heading names the section (h2, the section's aria-labelledby);
//   - it offers the ways on that gallery's tier has. Icons keep "Log in" and "See
//     the plans". Palettes and gradients (the LibraryGate variant, V3) lead with
//     "Create a free account" and keep "Log in" as the second control; they carry
//     NO plans link on this gate by design (the plans link sits on the Pro and
//     "more with Pro" variants, pinned in 273, 410 and 413). Icon groups are the
//     deliberate exception: a free account opens no more groups, so they offer
//     Pro only and have no Log in;
//   - Log in (and, on palettes and gradients, Create a free account) opens
//     sign-in, and a plans link, where there is one, goes to /plans;
//   - the focus order is the heading, then the primary control, then the
//     secondary (the faded rows above are never a stop);
//   - no locked asset is requested to draw the gate or its faded rows;
//   - nothing scrolls sideways at 320;
//   - the numbers in the heading and body are the data's, not typed.
//
// The expected words are worked out here by hand from the tier caps and the
// data files, not read back from src/data/galleryGateCopy.js.
//
// To see it fail: change the heading in GalleryEndGate.jsx (for example render
// `{heading}` as a <p>, or drop the Heading element) and the heading tests go red;
// give the palette gate a plans link in libraryGateCopy (src/data/galleryGateCopy.js)
// and the control-count and focus-order tests go red.
import { test, expect } from './base.js'
import { go, watch } from './helpers.js'
import { ICONIFY_HOSTS } from './iconify-stub.js'
import { LIBRARY_PALETTES } from '../../api/_lib/library/paletteLibrary.js'
import { GALLERY_GRADIENTS } from '../../api/_lib/library/gradientGallery.js'
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

// The open tiles of a palette or gradient results list; the fade sits outside `.lib-results`.
const OPEN_TILES = '.lib-results .vpt'

// `controls` is the gate's controls in document order: the primary (a pill) then
// the secondary (a link-styled control), as a role and an accessible name.
// `login` names the one that opens sign-in; `signup` the one that opens sign-up;
// `plans` the one that goes to /plans. Each is a name or null.
const GALLERIES = [
  {
    key: 'icons', route: '/create/icons', kind: 'anon',
    controls: [{ role: 'button', name: 'Log in' }, { role: 'link', name: 'See the plans' }],
    login: 'Log in', signup: null, plans: 'See the plans',
    heading: /^Log in to access [\d,]+ icons$/,
    body: /^You're seeing [\d,]+ icons from 5 sets\. A free account opens every icon across \d+ sets\./,
    ready: (page) => expect(page.locator('.ig .ic').first()).toBeVisible({ timeout: 20000 }),
  },
  {
    // LibraryGate, 'account' variant: a free account is the offer, Log in the second control.
    key: 'palettes', route: '/discover/palettes', kind: 'anon',
    controls: [{ role: 'button', name: 'Create a free account' }, { role: 'button', name: 'Log in' }],
    login: 'Log in', signup: 'Create a free account', plans: null,
    heading: `Log in to access ${GALLERY_TIER_LIMITS.free} palettes`,
    body: `You're seeing ${GALLERY_TIER_LIMITS.anonymous} of the ${LIBRARY_PALETTES.length} palettes. A free account opens ${GALLERY_TIER_LIMITS.free}; Pro opens all ${LIBRARY_PALETTES.length}.`,
    ready: (page) => expect(page.locator(OPEN_TILES)).toHaveCount(GALLERY_TIER_LIMITS.anonymous),
  },
  {
    key: 'gradients', route: '/discover/gradients', kind: 'anon',
    controls: [{ role: 'button', name: 'Create a free account' }, { role: 'button', name: 'Log in' }],
    login: 'Log in', signup: 'Create a free account', plans: null,
    heading: `Log in to access ${GALLERY_TIER_LIMITS.free} gradients`,
    body: `You're seeing ${GALLERY_TIER_LIMITS.anonymous} of the ${GALLERY_GRADIENTS.length} gradients. A free account opens ${GALLERY_TIER_LIMITS.free}; Pro opens all ${GALLERY_GRADIENTS.length}.`,
    ready: (page) => expect(page.locator(OPEN_TILES)).toHaveCount(GALLERY_TIER_LIMITS.anonymous),
  },
  {
    // The exception: logging in opens no more groups, so Pro is the only offer.
    key: 'icon groups', route: '/create/icons/groups', kind: 'pro',
    controls: [{ role: 'link', name: 'See what Pro includes' }],
    login: null, signup: null, plans: 'See what Pro includes',
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
      for (const c of g.controls) {
        await expect(gate.getByRole(c.role, { name: c.name, exact: true }), `${c.name} is missing`).toBeVisible()
      }
      if (g.plans) await expect(gate.getByRole('link', { name: g.plans, exact: true })).toHaveAttribute('href', '/plans')
      else await expect(gate.getByRole('link'), 'this gate offers no plans link').toHaveCount(0)
      if (!g.login) await expect(gate.getByRole('button', { name: 'Log in' }), 'a free account opens no more groups, so there is no Log in').toHaveCount(0)
      // Exactly the controls named, none hidden in the faded rows.
      await expect(gate.locator('a:not(.geg-fade *), button:not(.geg-fade *)')).toHaveCount(g.controls.length)
    })

    if (g.login) {
      test('Log in opens sign-in', async ({ page }) => {
        watch(page, `a signed-out visitor choosing Log in on ${g.key}`)
        const gate = await openGate(page, g)
        await gate.getByRole('button', { name: g.login, exact: true }).click()
        await expect(page.locator('[role="dialog"]')).toBeVisible()
        await expect(page).toHaveURL(new RegExp(`${g.route.replace(/\//g, '\\/')}$`))
      })
    }

    if (g.signup) {
      test('Create a free account opens sign-in, on the same page', async ({ page }) => {
        watch(page, `a signed-out visitor choosing Create a free account on ${g.key}`)
        const gate = await openGate(page, g)
        await gate.getByRole('button', { name: g.signup, exact: true }).click()
        await expect(page.locator('[role="dialog"]')).toBeVisible()
        await expect(page).toHaveURL(new RegExp(`${g.route.replace(/\//g, '\\/')}$`))
      })
    }

    // Palettes and gradients have no plans link on this gate (see the header), so
    // there is nothing to follow there; the others still go to /plans.
    if (g.plans) {
      test('the plans link goes to /plans', async ({ page }) => {
        watch(page, `a signed-out visitor choosing the plans on ${g.key}`)
        const gate = await openGate(page, g)
        await gate.getByRole('link', { name: g.plans, exact: true }).click()
        await expect(page).toHaveURL(/\/plans$/)
      })
    }

    test('focus goes heading, then the primary control, then the secondary', async ({ page }) => {
      watch(page, `a keyboard visitor tabbing through the ${g.key} gate`)
      const gate = await openGate(page, g)
      const heading = gate.getByRole('heading', { level: 2 })
      // The heading is not a tab stop; put the caret on it the way a screen
      // reader's cursor would, then Tab on from there.
      await heading.evaluate((el) => { el.setAttribute('tabindex', '-1'); el.focus() })
      await expect(heading).toBeFocused()
      const names = []
      const stops = g.controls.length
      for (let i = 0; i < stops; i++) {
        await page.keyboard.press('Tab')
        names.push(await page.evaluate(() => (document.activeElement?.textContent || '').trim()))
        expect(await page.evaluate(() => !!document.activeElement.closest('.geg-fade')), 'focus landed in the inert faded rows').toBe(false)
      }
      expect(names).toEqual(g.controls.map((c) => c.name))
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

// ── The faded tiles are the gallery's own, on its grid ──────────────────────
// To see these fail: render the fade in a grid of its own with another column
// template (the 390px gradient fade goes back to one column), or put a Pro
// palette into the stand-ins.
//
// Changed with LibraryGate: the fade now opens with the next free-tier rows (the
// ones a free account opens) and continues with locked stand-ins drawn from the
// withheld rows' stubs, so it is no longer "free-tier items only". The first
// faded tiles are asserted to be exactly the next free rows, in order, from the
// data; the rest must be real library names (a name is public, a colour is not).
// And because the primary control on this gate is a button, the fade is a pointer
// shortcut to it (not `inert`, see GalleryEndGate.jsx); what stays true is that it
// is hidden from assistive tech and holds nothing focusable.
const FADED = [
  {
    key: 'palettes', route: '/discover/palettes',
    free: LIBRARY_PALETTES.filter((p) => p.pro !== true).slice(GALLERY_TIER_LIMITS.anonymous, GALLERY_TIER_LIMITS.free),
    names: new Set(LIBRARY_PALETTES.map((p) => p.name)),
  },
  {
    key: 'gradients', route: '/discover/gradients',
    free: GALLERY_GRADIENTS.slice(GALLERY_TIER_LIMITS.anonymous, GALLERY_TIER_LIMITS.free),
    names: new Set(GALLERY_GRADIENTS.map((g) => g.name)),
  },
]

for (const f of FADED) {
  test.describe(`${f.key}: the faded tiles behind the signed-out gate`, () => {
    test('open with the next free-tier items, hidden from assistive tech, with nothing to focus', async ({ page }) => {
      watch(page, `a signed-out visitor at the end of ${f.key}`)
      await page.setViewportSize({ width: 1440, height: 900 })
      await go(page, f.route)
      await expect(page.locator(OPEN_TILES)).toHaveCount(GALLERY_TIER_LIMITS.anonymous)
      const fade = page.locator('.geg[data-gate="anon"] [data-gate-fade]')
      await expect(fade).toHaveAttribute('aria-hidden', 'true')
      const names = (await fade.locator('.vpt-name').allInnerTexts()).map((n) => n.trim())
      expect(names.length, 'no faded tiles - this check would be vacuous').toBeGreaterThanOrEqual(f.free.length)
      expect(names.slice(0, f.free.length), 'the faded tiles do not start with the next free-tier items').toEqual(f.free.map((r) => r.name))
      expect(names.filter((n) => !f.names.has(n)), 'a faded tile is not a library row').toEqual([])
      // Nothing inside is a tab stop: no link, no button, and focusing anything leaves focus where it was.
      expect(await fade.locator('a, button, [tabindex]').count(), 'a faded tile holds a control').toBe(0)
      const reached = await fade.evaluate((el) => [...el.querySelectorAll('a, button')].some((c) => { c.focus(); return document.activeElement === c }))
      expect(reached, 'a faded control took focus').toBe(false)
    })

    for (const width of [390, 1440]) {
      test(`sit on the live grid's edges at ${width}`, async ({ page }) => {
        watch(page, `a signed-out visitor at ${width}px on ${f.key}`)
        await page.setViewportSize({ width, height: width < 800 ? 844 : 900 })
        await go(page, f.route)
        await expect(page.locator(OPEN_TILES)).toHaveCount(GALLERY_TIER_LIMITS.anonymous)
        const edges = (sel) => page.locator(sel).evaluateAll((els) => [...new Set(els.flatMap((e) => { const r = e.getBoundingClientRect(); return [Math.round(r.left * 2) / 2, Math.round(r.right * 2) / 2] }))])
        const live = await edges(OPEN_TILES)
        const faded = await edges('.geg-fade .vpt')
        expect(faded.length, 'no faded cards').toBeGreaterThan(1)
        for (const e of live) expect(faded, `a live card edge at ${e} is missing from the faded cards`).toContain(e)
        for (const e of faded) expect(live.some((l) => Math.abs(l - e) <= 0.5) || e > Math.max(...live), `a faded edge at ${e} is off the live grid`).toBe(true)
      })
    }
  })
}
