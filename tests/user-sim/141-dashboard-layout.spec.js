// The signed-in workspace (/projects) as a LAYOUT: what comes in which order at a
// phone, a tablet and a laptop, what the first screen holds, and what each part
// of it says. 52-user-home reads the content of each section; 86-account-
// breakpoints holds the fold, the Tab order and the cap; this file holds the
// shape of the whole page at 390, 768 and 1440.
//
//   1440  Two columns: greeting, title, the lead card and the other projects on
//         the left; Today (and Recent exports) in a rail on the right, level with
//         the greeting. Start something, Discover and the Pro panel run the full
//         width underneath, so the rail never leaves a hole beside them.
//   768   One column, in reading order: the lead and the rows, then Today and
//   390   Recent exports, then Start something, Discover, Pro.
//
// Everything is asserted on MEASURED boxes and on the text a person reads, from a
// fixed set of three projects with known parts and known ages, so "1 of 4 parts ·
// Edited 1 day ago" is a hand-checked string and not a re-computation of the
// page's own.
//
// MUTATION (each was made, the named test went red, then it was put back):
//   Projects.jsx   `{signedOut ? <>{rail}{main}</> : <>{main}{rail}</>}` with the
//                  rail first for a signed-in account      -> "sections run in this order"
//   Projects.jsx   a second <StartSomething /> before .uh-dash  -> 86-account-breakpoints "the work comes before Discover and the Pro panel"
//   ContinueCard   Open project before Continue in the DOM   -> 86-account-breakpoints "tabs in the order it is read"
//   Projects.jsx   `const lead = recent[0]` (newest, archived or not)
//                                                           -> "the lead card is the newest project that is not archived"
//   Greeting.jsx   FIRST_VISIT_MS = 0                       -> "a new account is welcomed, a returning one welcomed back"
//   ProjectRows    drop ` · Edited ${status.edited}` from the row -> "each row says its parts and when it was edited"
//   Projects.jsx   `!hasProjects` branch returns null (no starter)  -> "an account with no projects"
//   projects.css   `.uh .uh-link, .uh .uh-open { min-height: 30px }` and
//                  `.uh .uh-cta` to 30px                    -> "every button and link on a phone is 44px"
//   projects.css   `.uh .uh-quick { min-width: 520px }`     -> "no horizontal overflow"
import { test, expect } from './base.js'
import { go, watch, expectRendered, signIn } from './helpers.js'
import { DEFAULT_DESIGN } from '../../src/data/designDefaults.js'

const SIZES = [
  { name: 'phone', width: 390, height: 844 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'laptop', width: 1440, height: 900 },
]
const MINUTE = 60_000
const ago = (ms) => new Date(Date.now() - ms).toISOString()
const clone = () => JSON.parse(JSON.stringify(DEFAULT_DESIGN))

/** All four parts done: its next step is the contrast check. */
function complete() {
  const design = clone()
  design.palette.colors = ['#1A0B2E', '#4B1F9E', '#8B5CF6', '#C9F24D', '#F5F3FF']
  design.fonts.heading.family = 'Fraunces'
  design.fonts.body.family = 'Manrope'
  design.typeScale.base = 17
  design.typeScale.ratio = 1.333
  design.tints.scale = ['#1A0B2E', '#2E1650', '#4B1F9E', '#6C3FD4', '#8B5CF6', '#B69BF0']
  return { id: 'p-done', name: 'Violet Lime', design, createdAt: ago(9 * 864e5), updatedAt: ago(2 * 60 * MINUTE) }
}
/** Colour only: 1 of 4 parts, and the type scale is next. */
function half(id, name, updatedAt) {
  const design = clone()
  design.palette.colors = ['#0B2A45', '#1F4E79', '#F2A488', '#FDEDE4']
  return { id, name, design, createdAt: ago(9 * 864e5), updatedAt }
}

// Violet Lime leads (2 hours ago). Old Harbour was touched more recently (30 minutes
// ago) but is archived, so it neither leads nor sits above Harbour Rebrand.
const THREE = [
  complete(),
  half('p-half', 'Harbour Rebrand', ago(26 * 60 * MINUTE)),
  { ...half('p-old', 'Old Harbour', ago(30 * MINUTE)), archived: true },
]

/** Six exports on record, newest first, at known ages. */
async function withExports(page) {
  await page.addInitScript(() => {
    try {
      const at = Date.now()
      localStorage.setItem('vs-recent-exports', JSON.stringify(
        ['one', 'two', 'three', 'four', 'five', 'six'].map((n, i) => ({
          id: `e${i}`, tool: 'palette', toolLabel: 'Palette Builder', format: 'CSS', filename: `${n}-tokens.css`, bytes: 2048, at: at - (5 + i * 10) * 60 * 1000, projectId: null,
        })),
      ))
    } catch { /* private mode */ }
  })
}

async function open(page, size, opts = {}) {
  await page.setViewportSize({ width: size.width, height: size.height })
  await signIn(page, { plan: 'free', projects: THREE, ...opts })
  await go(page, '/projects')
  await expectRendered(page, '/projects')
}

/** A box in document coordinates, or null when it is not drawn. */
const box = (page, selector) => page.evaluate((sel) => {
  const el = document.querySelector(sel)
  if (!el) return null
  const r = el.getBoundingClientRect()
  if (!r.width && !r.height) return null
  return { top: Math.round(r.top + scrollY), bottom: Math.round(r.bottom + scrollY), left: Math.round(r.left), right: Math.round(r.right) }
}, selector)

for (const size of SIZES) {
  test.describe(`the workspace at ${size.width}px (${size.name})`, () => {
    test('sections run in this order, in the DOM and on the page', async ({ page }) => {
      watch(page, `a designer reading down their workspace on a ${size.name}`)
      await withExports(page)
      await open(page, size)

      const ORDER = ['.uh-greet', '.uh-h1', '.uh-dash-main > .uh-continue', '.uh-rows', '.uh-today', '.uh-exports', '.uh-start', '.uh-disc-head', '.uh-pro']
      // Reading order is the same at every width: the rail follows the work in the DOM and is
      // placed beside it by the grid at 1001px and up.
      const dom = await page.evaluate((sels) => {
        const els = sels.map((s) => document.querySelector(s))
        return {
          missing: sels.filter((s, i) => !els[i]),
          inOrder: els.slice(1).every((el, i) => !!(els[i].compareDocumentPosition(el) & Node.DOCUMENT_POSITION_FOLLOWING)),
        }
      }, ORDER)
      expect(dom.missing, 'sections that did not render').toEqual([])
      expect(dom.inOrder, `the DOM order is not ${ORDER.join(' > ')}`).toBe(true)

      const b = {}
      for (const sel of ORDER) b[sel] = await box(page, sel)
      const below = (a, z, why) => expect(b[z].top, `${z} (y=${b[z].top}) ${why} ${a} (ends y=${b[a].bottom})`).toBeGreaterThanOrEqual(b[a].bottom - 1)

      if (size.width > 1000) {
        // The work runs down the left; the rail sits to its right, level with the greeting.
        for (const [a, z] of [['.uh-greet', '.uh-h1'], ['.uh-h1', '.uh-dash-main > .uh-continue'], ['.uh-dash-main > .uh-continue', '.uh-rows'], ['.uh-rows', '.uh-start'], ['.uh-start', '.uh-disc-head'], ['.uh-disc-head', '.uh-pro']]) {
          below(a, z, 'is not below')
        }
        expect(b['.uh-today'].left, 'Today is not to the right of the lead card').toBeGreaterThanOrEqual(b['.uh-dash-main > .uh-continue'].right)
        expect(Math.abs(b['.uh-today'].top - b['.uh-greet'].top), 'the rail does not start level with the greeting').toBeLessThanOrEqual(2)
        below('.uh-today', '.uh-exports', 'is not below')
        expect(b['.uh-exports'].left, 'Recent exports is not in the rail with Today').toBe(b['.uh-today'].left)
        // Start something clears both columns, so no hole opens under the rail.
        expect(b['.uh-start'].top, 'Start something starts beside the rail').toBeGreaterThanOrEqual(b['.uh-exports'].bottom - 1)
      } else {
        // Stacked: each section ends before the next begins, Today after the rows.
        for (let i = 1; i < ORDER.length; i++) below(ORDER[i - 1], ORDER[i], 'is not below')
        // Recent exports shows all six when stacked, four beside the rail.
        await expect(page.locator('.uh-export:visible')).toHaveCount(6)
      }
      if (size.width > 1000) await expect(page.locator('.uh-export:visible')).toHaveCount(4)
    })

    test('the lead card is the newest project that is not archived', async ({ page }) => {
      watch(page, 'a designer picking up their last project')
      await open(page, size)

      const lead = page.locator('.uh-dash-main > .uh-continue')
      await expect(lead.locator('.uh-continue-name')).toHaveText('Violet Lime')
      await expect(lead.locator('.uh-meta'), 'Ready, two hours ago: from the saved design and its age').toHaveText('Ready · Edited 2 hours ago')
      await expect(lead, 'the archived project is newer, and must not lead').not.toContainText('Old Harbour')
      // The strip is the project's own five colours, in order.
      expect(await lead.locator('.uh-strip > span').evaluateAll((s) => s.map((x) => getComputedStyle(x).backgroundColor)))
        .toEqual(['rgb(26, 11, 46)', 'rgb(75, 31, 158)', 'rgb(139, 92, 246)', 'rgb(201, 242, 77)', 'rgb(245, 243, 255)'])
      // All four parts done: the next step is the contrast check, and Open goes to the project's page.
      await expect(lead.getByRole('link', { name: 'Check the contrast for Violet Lime' })).toHaveAttribute('href', '/create/contrast')
      await expect(lead.getByRole('link', { name: 'Open Violet Lime' })).toHaveAttribute('href', '/projects/p-done')
    })

    test('the lead card names the next step for a project that is part done', async ({ page }) => {
      watch(page, 'a designer whose newest project has only its colours')
      await open(page, size, { projects: [half('p-half', 'Harbour Rebrand', ago(3 * 60 * MINUTE))] })

      const lead = page.locator('.uh-dash-main > .uh-continue')
      await expect(lead.getByRole('link', { name: 'Continue Harbour Rebrand: set the type scale' })).toHaveAttribute('href', '/create/type-scale')
      await expect(lead.locator('.uh-parts > li')).toHaveText(['Colour, done, 4 colours', 'Type, not set', 'Type scale, not set', 'Tints, not set'])
      // One project: the lead alone, no rows.
      await expect(page.locator('.uh-rows')).toHaveCount(0)
    })

    test('each row says its parts and when it was edited', async ({ page }) => {
      watch(page, 'a designer scanning their other projects')
      await open(page, size)

      const rows = page.locator('.uh-rows .uh-row')
      await expect(rows.locator('.uh-row-name')).toHaveText(['Harbour Rebrand', 'Old Harbour'])
      await expect(rows.locator('.uh-row-meta')).toHaveText(['1 of 4 parts · Edited 1 day ago', 'Archived · 1 of 4 parts · Edited 30 minutes ago'])
      // Every row is one link to its page, and its words fit the screen.
      await expect(rows.first().locator('a')).toHaveAttribute('href', '/projects/p-half')
      await expect(rows.last().locator('a')).toHaveAttribute('href', '/projects/p-old')
      const inside = await rows.locator('.uh-row-meta, .uh-row-name').evaluateAll((els) => els.map((el) => el.getBoundingClientRect().right <= innerWidth))
      expect(inside.every(Boolean), 'a row\'s words run off the screen').toBe(true)
    })

    test('a new account is welcomed, a returning one welcomed back', async ({ page }) => {
      watch(page, 'a designer on the first minutes of a new account')
      await open(page, size, { creationTime: Date.now() - 2 * MINUTE })
      const hello = page.getByTestId('greeting')
      await expect(hello).toHaveText('Welcome, Freya.')
      // It is a line of text above the title, not a heading: the page is still "Your workspace".
      await expect(page.getByRole('heading', { level: 1 })).toHaveText('Your workspace')
      expect(await hello.evaluate((el) => !!el.closest('h1, h2, h3'))).toBe(false)
      const g = await box(page, '.uh-greet')
      const h = await box(page, '.uh-h1')
      expect(g.bottom, 'the greeting is not above the title').toBeLessThanOrEqual(h.top + 1)
    })

    test('an account made more than ten minutes ago is welcomed back', async ({ page }) => {
      watch(page, 'a designer eleven minutes into an account')
      await open(page, size, { creationTime: Date.now() - 11 * MINUTE })
      await expect(page.getByTestId('greeting')).toHaveText('Welcome back, Freya.')
    })

    test('an account with no projects is given the starter, where the lead would be', async ({ page }) => {
      watch(page, 'a brand new account with nothing saved')
      await open(page, size, { projects: [] })

      const starter = page.getByTestId('starter-card')
      await expect(starter.getByRole('heading', { level: 2, name: 'Start your first project' })).toBeVisible()
      await expect(starter.getByRole('list', { name: 'The walkthrough' }).getByRole('listitem')).toHaveText(['Colour', 'Type', 'Type scale', 'Tints'])
      expect(await starter.getByRole('list', { name: 'The walkthrough' }).getByRole('link').evaluateAll((a) => a.map((x) => x.getAttribute('href'))))
        .toEqual(['/create/palette', '/create/font-pair', '/create/type-scale', '/create/tint'])
      // No lead, no rows, and it is the first block under the title.
      await expect(page.locator('.uh-rows')).toHaveCount(0)
      await expect(page.locator('.uh-dash-main > .uh-continue')).toHaveCount(1)
      const s = await box(page, '[data-testid="starter-card"]')
      const h = await box(page, '.uh-h1')
      const start = await box(page, '.uh-start')
      expect(s.top, 'the starter is not under the title').toBeGreaterThanOrEqual(h.bottom - 1)
      expect(start.top, 'Start something is above the starter').toBeGreaterThanOrEqual(s.bottom - 1)
      // Every step is a 44px target, and the list ends inside the card.
      const steps = await starter.getByRole('list', { name: 'The walkthrough' }).getByRole('link').evaluateAll((a) => a.map((x) => Math.round(x.getBoundingClientRect().height)))
      expect(Math.min(...steps), `a starter step is under 44px tall: ${steps}`).toBeGreaterThanOrEqual(44)
    })

    for (const theme of ['light', 'dark']) {
      test(`no horizontal overflow with projects or without, ${theme}`, async ({ page }) => {
        watch(page, `a designer on a ${size.name} in ${theme}`)
        await page.emulateMedia({ colorScheme: theme })
        await withExports(page)
        await open(page, size)
        const measure = () => page.evaluate(() => {
          const de = document.documentElement
          const bleed = [...document.querySelectorAll('.uh *')]
            .filter((el) => { const r = el.getBoundingClientRect(); return r.width > 0 && (r.right > de.clientWidth + 1 || r.left < -1) })
            .slice(0, 4).map((el) => `${el.tagName.toLowerCase()}.${String(el.className).split(' ')[0]}`)
          return { overflow: de.scrollWidth - de.clientWidth, bleed, cards: document.querySelectorAll('.proj-card').length }
        })
        const withProjects = await measure()
        expect(withProjects.cards, 'no projects rendered, so the sweep measured nothing').toBe(3)
        expect(withProjects.overflow, `the page scrolls sideways by ${withProjects.overflow}px`).toBe(0)
        expect(withProjects.bleed, 'painting outside the viewport').toEqual([])

        // Same sweep on the starter: a fresh page, no account projects.
        const fresh = await page.context().newPage()
        await signIn(fresh, { plan: 'free', projects: [] })
        await fresh.setViewportSize({ width: size.width, height: size.height })
        await go(fresh, '/projects')
        await expectRendered(fresh, '/projects')
        await expect(fresh.getByTestId('starter-card')).toBeVisible()
        const empty = await fresh.evaluate(() => {
          const de = document.documentElement
          return { overflow: de.scrollWidth - de.clientWidth, bleed: [...document.querySelectorAll('.uh *')].filter((el) => { const r = el.getBoundingClientRect(); return r.width > 0 && (r.right > de.clientWidth + 1 || r.left < -1) }).length }
        })
        expect(empty, 'the starter state overflows').toEqual({ overflow: 0, bleed: 0 })
      })
    }
  })
}

test.describe('the first screen', () => {
  test('at 1440x900 Continue and New project are both above y=600, with one filled button', async ({ page }) => {
    watch(page, 'a designer on a laptop opening their workspace')
    await open(page, SIZES[2])
    const cont = await page.getByRole('link', { name: 'Check the contrast for Violet Lime' }).evaluate((el) => { const r = el.getBoundingClientRect(); return { top: Math.round(r.top), bottom: Math.round(r.bottom) } })
    const newBtn = await page.getByRole('button', { name: 'New project' }).evaluate((el) => Math.round(el.getBoundingClientRect().top))
    expect(cont.top, `Continue starts at y=${cont.top}`).toBeLessThan(600)
    expect(cont.bottom, 'Continue is cut by the fold').toBeLessThanOrEqual(900)
    expect(newBtn, `New project is at y=${newBtn}`).toBeLessThan(600)

    // One accent-filled control in the page body on the first screen: Continue. New project is outlined.
    const filled = await page.evaluate(() => {
      const probe = document.createElement('i')
      probe.style.background = 'var(--accent)'
      document.body.append(probe)
      const accent = getComputedStyle(probe).backgroundColor
      probe.remove()
      return [...document.querySelectorAll('.uh a[href], .uh button')]
        .filter((el) => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0 && r.top < innerHeight && getComputedStyle(el).backgroundColor === accent })
        .map((el) => (el.getAttribute('aria-label') || el.innerText).trim())
    })
    expect(filled, 'more than one filled button on the first screen').toEqual(['Check the contrast for Violet Lime'])
  })

  test('at 390x844 the Continue button is on the first screen', async ({ page }) => {
    watch(page, 'a designer on a phone reopening a project')
    await open(page, SIZES[0])
    const bottom = await page.getByRole('link', { name: 'Check the contrast for Violet Lime' }).evaluate((el) => Math.round(el.getBoundingClientRect().bottom))
    expect(bottom, 'the first screen does not hold the Continue button').toBeLessThanOrEqual(844)
  })
})

test.describe('on a phone', () => {
  for (const [label, projects] of [['with projects', THREE], ['with none', []]]) {
    test(`every button and link on a phone is 44px, ${label}`, async ({ browser }) => {
      // A touch phone: the coarse pointer is what turns on the 44px floor for the links the page keeps small by mouse.
      const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true })
      const page = await context.newPage()
      watch(page, `a thumb on a phone, ${label}`)
      await withExports(page)
      await signIn(page, { plan: 'free', projects })
      await go(page, '/projects')
      await expectRendered(page, '/projects')

      const small = await page.evaluate(() => {
        const els = [...document.querySelectorAll('.uh a[href], .uh button')]
          .map((el) => ({ el, r: el.getBoundingClientRect() }))
          .filter(({ r }) => r.width > 0 && r.height > 0)
        // See plans is text-wide by design: an inline link in a sentence, held to 24px both ways.
        const textWide = (el) => el.classList.contains('uh-plans-link')
        return {
          count: els.length,
          small: els
            .filter(({ el, r }) => !textWide(el) && (r.height < 44 || r.width < 44))
            .map(({ el, r }) => `${(el.getAttribute('aria-label') || el.innerText || el.tagName).trim().replace(/\s+/g, ' ').slice(0, 32)} ${Math.round(r.width)}x${Math.round(r.height)}`),
          plans: els.filter(({ el, r }) => el.classList.contains('uh-plans-link') && r.height < 24).length,
        }
      })
      // POSITIVE CONTROL: the sweep found the page's controls.
      expect(small.count, 'the sweep found no controls to measure').toBeGreaterThan(10)
      expect(small.small, 'targets under 44px').toEqual([])
      expect(small.plans, 'See plans is under 24px').toBe(0)
      await context.close()
    })
  }
})
