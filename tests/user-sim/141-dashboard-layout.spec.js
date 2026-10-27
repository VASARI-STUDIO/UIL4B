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
import { GALLERY_PALETTES } from '../../api/_lib/library/paletteGallery.js'

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
      await expect(lead.getByRole('link', { name: 'Check the contrast, Violet Lime' })).toHaveAttribute('href', '/create/contrast')
      await expect(lead.getByRole('link', { name: 'Open project, Violet Lime' })).toHaveAttribute('href', '/projects/p-done')
    })

    test('the lead card names the next step for a project that is part done', async ({ page }) => {
      watch(page, 'a designer whose newest project has only its colours')
      await open(page, size, { projects: [half('p-half', 'Harbour Rebrand', ago(3 * 60 * MINUTE))] })

      const lead = page.locator('.uh-dash-main > .uh-continue')
      await expect(lead.getByRole('link', { name: 'Continue: set the type scale, Harbour Rebrand' })).toHaveAttribute('href', '/create/type-scale')
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
    const cont = await page.getByRole('link', { name: 'Check the contrast, Violet Lime' }).evaluate((el) => { const r = el.getBoundingClientRect(); return { top: Math.round(r.top), bottom: Math.round(r.bottom) } })
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
    expect(filled, 'more than one filled button on the first screen').toEqual(['Check the contrast, Violet Lime'])
  })

  test('at 390x844 the Continue button is on the first screen', async ({ page }) => {
    watch(page, 'a designer on a phone reopening a project')
    await open(page, SIZES[0])
    const bottom = await page.getByRole('link', { name: 'Check the contrast, Violet Lime' }).evaluate((el) => Math.round(el.getBoundingClientRect().bottom))
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

// ── The states and compositions the first layout did not have ───────────────────────────────────
//
// Archived-only accounts, rows without a Colour part, the row collapse, the locked Discover cards,
// the phone's date line / New project / four tools, the tablet's one-row Today, and the type floor.

/** Every accent-filled control that starts on the first screen, by the name a person would give it. */
const filledOnFirstScreen = (page) => page.evaluate(() => {
  const probe = document.createElement('i')
  probe.style.background = 'var(--accent)'
  document.body.append(probe)
  const accent = getComputedStyle(probe).backgroundColor
  probe.remove()
  return [...document.querySelectorAll('.uh a[href], .uh button')]
    .filter((el) => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0 && r.top < innerHeight && getComputedStyle(el).backgroundColor === accent })
    .map((el) => (el.getAttribute('aria-label') || el.innerText).trim())
})

/** `n` projects, newest first: the first leads, the rest are rows. Parts: Colour only. */
const many = (n) => Array.from({ length: n }, (_, i) => half(`p-${i + 1}`, `Project ${i + 1}`, ago((i + 1) * 60 * MINUTE)))

const ALL_ARCHIVED = [
  { ...complete(), archived: true },
  { ...half('p-old', 'Old Harbour', ago(30 * MINUTE)), archived: true },
]

/** A project whose Colour part was never set: the default design, nothing else. */
const bare = () => ({ id: 'p-bare', name: 'Bare Project', design: clone(), createdAt: ago(9 * 864e5), updatedAt: ago(3 * 864e5) })

for (const size of SIZES) {
  test.describe(`the workspace states at ${size.width}px (${size.name})`, () => {
    test('when every project is archived the starter leads and says why, and the archived projects follow as rows', async ({ page }) => {
      watch(page, 'a designer whose projects are all archived')
      await open(page, size, { projects: ALL_ARCHIVED })

      const starter = page.getByTestId('starter-card')
      await expect(starter.getByRole('heading', { level: 2, name: 'Start a new project' })).toBeVisible()
      await expect(starter).toContainText('All your projects are archived. New project sets up colour, type, type scale and tints, and saves as you go.')
      await expect(page.getByText('Start your first project'), 'this is not a first project').toHaveCount(0)
      // There is nothing to continue: no project card, no Continue, no Open project.
      await expect(page.locator('.proj-card.uh-continue')).toHaveCount(0)
      await expect(page.getByRole('link', { name: /^(Continue: |Check the contrast|Open project, )/ })).toHaveCount(0)
      // The rows are the archived projects, newest first, and the list says what it holds.
      const rows = page.getByRole('list', { name: 'Archived projects' })
      await expect(page.getByRole('list', { name: 'Other projects' })).toHaveCount(0)
      await expect(rows.locator('.uh-row-name')).toHaveText(['Old Harbour', 'Violet Lime'])
      await expect(rows.locator('.uh-row-meta')).toHaveText(['Archived · 1 of 4 parts · Edited 30 minutes ago', 'Archived · 4 of 4 parts · Edited 2 hours ago'])
      await expect(rows.getByRole('link').first()).toHaveAttribute('href', '/projects/p-old')

      // Order: title, then the starter, then the rows.
      const h = await box(page, '.uh-h1')
      const s = await box(page, '[data-testid="starter-card"]')
      const r = await box(page, '.uh-rows')
      expect(s.top, 'the starter is not under the title').toBeGreaterThanOrEqual(h.bottom - 1)
      expect(r.top, 'the rows are not under the starter').toBeGreaterThanOrEqual(s.bottom - 1)
      // The one filled button on the first screen is the starter's; New project is outlined.
      expect(await filledOnFirstScreen(page)).toEqual(['Start the walkthrough'])
    })

    test('the starter\'s button from an all-archived account starts the walkthrough', async ({ page }) => {
      watch(page, 'a designer starting fresh after archiving everything')
      await open(page, size, { projects: ALL_ARCHIVED })
      await page.getByTestId('starter-card').getByRole('button', { name: 'Start the walkthrough' }).click()
      await expect(page).toHaveURL(/\/create\/palette$/)
    })

    test('a row whose Colour is not set draws a dashed empty box and says so', async ({ page }) => {
      watch(page, 'a designer with a project that has no palette yet')
      await open(page, size, { projects: [complete(), half('p-half', 'Harbour Rebrand', ago(26 * 60 * MINUTE)), bare()] })

      const rows = page.locator('.uh-rows .uh-row')
      await expect(rows.locator('.uh-row-name')).toHaveText(['Harbour Rebrand', 'Bare Project'])
      await expect(rows.locator('.uh-row-meta')).toHaveText(['1 of 4 parts · Edited 1 day ago', 'Colour not set · 0 of 4 parts · Edited 3 days ago'])
      // A row with a Colour part draws its colours; the other draws none (the default palette would read as its own).
      const swatches = await rows.locator('.uh-mini').evaluateAll((els) => els.map((el) => ({
        empty: el.classList.contains('is-empty'),
        stops: el.querySelectorAll('span').length,
        border: getComputedStyle(el).borderTopStyle,
      })))
      expect(swatches).toEqual([{ empty: false, stops: 4, border: 'none' }, { empty: true, stops: 0, border: 'dashed' }])
      // Both boxes are the same size, so the rows still line up.
      const sizes = await rows.locator('.uh-mini').evaluateAll((els) => els.map((el) => { const b = el.getBoundingClientRect(); return `${Math.round(b.width)}x${Math.round(b.height)}` }))
      expect(sizes[0]).toBe(sizes[1])
    })

    test('a lead whose Colour is not set says so and offers to build the palette', async ({ page }) => {
      watch(page, 'a designer whose only project has no palette')
      await open(page, size, { projects: [bare()] })
      const lead = page.locator('.uh-dash-main > .uh-continue')
      await expect(lead.locator('.uh-strip'), 'the default palette is drawn as the project\'s own').toHaveCount(0)
      const empty = lead.locator('.uh-strip-empty')
      await expect(empty).toContainText('Colour not set.')
      await expect(empty.getByRole('link', { name: 'Build the palette' })).toHaveAttribute('href', '/create/palette')
      expect(await empty.evaluate((el) => getComputedStyle(el).borderBottomStyle)).toBe('dashed')
    })

    test('past six projects five rows show and Show all opens the rest in place', async ({ page }) => {
      watch(page, 'a Pro designer with seven projects')
      await open(page, size, { plan: 'pro', projects: many(7) })

      const rows = page.locator('.uh-rows .uh-row-name')
      await expect(rows).toHaveText(['Project 2', 'Project 3', 'Project 4', 'Project 5', 'Project 6'])
      const more = page.getByRole('button', { name: 'Show all 7 projects' })
      await expect(more).toHaveAttribute('aria-expanded', 'false')
      expect(await more.evaluate((el) => Math.round(el.getBoundingClientRect().height)), 'Show all is under 44px').toBeGreaterThanOrEqual(44)
      const below = await page.evaluate(() => document.querySelector('.uh-more').getBoundingClientRect().top >= document.querySelector('.uh-rows').getBoundingClientRect().bottom - 1)
      expect(below, 'Show all is not under the rows').toBe(true)

      await more.click()
      await expect(rows).toHaveText(['Project 2', 'Project 3', 'Project 4', 'Project 5', 'Project 6', 'Project 7'])
      const fewer = page.getByRole('button', { name: 'Show fewer' })
      await expect(fewer).toHaveAttribute('aria-expanded', 'true')
      await expect(fewer, 'focus stays on the button that was pressed').toBeFocused()
      await fewer.click()
      await expect(rows).toHaveCount(5)
      await expect(page.getByRole('button', { name: 'Show all 7 projects' })).toHaveAttribute('aria-expanded', 'false')
    })

    test('up to six projects show every row and no Show all', async ({ page }) => {
      watch(page, 'a Pro designer with six projects')
      await open(page, size, { plan: 'pro', projects: many(6) })
      await expect(page.locator('.uh-rows .uh-row-name')).toHaveCount(5)
      await expect(page.locator('.uh-more'), 'six projects fit without a toggle').toHaveCount(0)
    })

    test('a locked Discover card says what it is and carries no colour', async ({ page }) => {
      watch(page, 'a free designer looking at what is new in Discover')
      await open(page, size)
      const locked = page.locator('.uh-disc-card.is-locked')
      expect(await locked.count(), 'no locked card on a free account: the sweep measured nothing').toBeGreaterThan(0)
      const cards = await locked.evaluateAll((els) => els.map((el) => ({
        label: el.querySelector('.uh-disc-lock-label')?.textContent?.trim(),
        name: el.querySelector('.uh-disc-name')?.textContent?.trim(),
        meta: el.querySelector('.uh-disc-meta')?.textContent?.trim(),
        accessible: el.getAttribute('aria-label'),
        strips: el.querySelectorAll('.uh-disc-strip, .uh-disc-strip--locked').length,
        painted: [...el.querySelectorAll('[style]')].length,
      })))
      for (const c of cards) {
        expect(c.label).toBe('Pro palette. Opens with Pro')
        expect(c.meta, `${c.name}: the meta line`).toMatch(/^\d+ colours? · Pro$/)
        expect(c.accessible, 'the link name contains what is shown, plus what it is').toBe(`${c.name}, Pro palette, opens with Pro`)
        expect(c.strips, `${c.name} draws a stand-in strip`).toBe(0)
        expect(c.painted, `${c.name} paints something inline`).toBe(0)
      }
      await expect(page.getByRole('link', { name: `${cards[0].name}, Pro palette, opens with Pro` })).toHaveAttribute('href', '/discover/palettes')
    })

    test('no colour of a locked palette is anywhere in the Discover section', async ({ page }) => {
      watch(page, 'a free designer whose page must not hold a paid palette')
      await open(page, size)
      const names = await page.locator('.uh-disc-card.is-locked .uh-disc-name').allInnerTexts()
      expect(names.length, 'no locked card to look for').toBeGreaterThan(0)
      // Greys and white are half the stylesheet, so only the chromatic colours can tell a leak from the page's own ink.
      const chromatic = (h) => Math.max(...[1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16))) - Math.min(...[1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16))) >= 24
      const hexes = [...new Set(GALLERY_PALETTES.filter((p) => names.includes(p.name)).flatMap((p) => p.colors.map((c) => c.toUpperCase())).filter(chromatic))]
      expect(hexes.length, 'the locked palettes were not found in the library').toBeGreaterThan(0)
      const inPage = await page.evaluate((list) => {
        const section = document.querySelector('.uh-disc')
        const html = section.outerHTML.toUpperCase()
        const rgb = (h) => `RGB(${parseInt(h.slice(1, 3), 16)}, ${parseInt(h.slice(3, 5), 16)}, ${parseInt(h.slice(5, 7), 16)})`
        const painted = new Set()
        for (const el of section.querySelectorAll('*')) {
          const cs = getComputedStyle(el)
          for (const v of [cs.backgroundColor, cs.color, cs.borderTopColor, cs.borderBottomColor]) painted.add(v.toUpperCase())
        }
        return list.filter((h) => html.includes(h) || html.includes(rgb(h)) || painted.has(rgb(h)))
      }, hexes)
      expect(inPage, 'a locked palette\'s colours are on the page').toEqual([])
    })
  })
}

test.describe('Discover for a Pro account', () => {
  // POSITIVE CONTROL for the locked-card tests: the same section does carry colours when the account may open them.
  test('draws real colours and no lock label', async ({ page }) => {
    watch(page, 'a Pro designer looking at what is new in Discover')
    await open(page, SIZES[2], { plan: 'pro' })
    await expect(page.locator('.uh-disc-card')).toHaveCount(4)
    await expect(page.locator('.uh-disc-card.is-locked')).toHaveCount(0)
    const first = await page.locator('.uh-disc-card').first().locator('.uh-disc-strip > span').evaluateAll((s) => s.map((x) => getComputedStyle(x).backgroundColor))
    expect(first.length).toBeGreaterThan(1)
    expect(first.every((c) => c !== 'rgba(0, 0, 0, 0)')).toBe(true)
  })
})

test.describe('on a phone, the page is composed for a thumb', () => {
  const phone = SIZES[0]

  test('the date and time are one line under the title, and the big clock is not drawn', async ({ page }) => {
    watch(page, 'a designer glancing at the top of their workspace on a phone')
    await open(page, phone)
    const line = page.locator('.uh-clock-line')
    await expect(line).toBeVisible()
    const where = await page.evaluate(() => {
      const top = (s) => document.querySelector(s).getBoundingClientRect()
      return { h1Bottom: top('.uh-h1').bottom, line: top('.uh-clock-line'), firstBlock: top('.uh-dash-main').top }
    })
    expect(where.line.top, 'the date line is above the title').toBeGreaterThanOrEqual(where.h1Bottom - 1)
    expect(where.line.bottom, 'the date line is not above the work').toBeLessThanOrEqual(where.firstBlock + 1)
    expect(where.line.height, 'it is one line, not a block').toBeLessThan(30)
    // The weekday and month are the browser's own; the time is a clock reading in the mono face.
    const expected = await page.evaluate(() => {
      const d = new Date()
      return { weekday: d.toLocaleDateString([], { weekday: 'long' }), month: d.toLocaleDateString([], { month: 'long' }) }
    })
    await expect(line).toContainText(expected.weekday)
    await expect(line).toContainText(expected.month)
    await expect(line.locator('.uh-clk-time')).toHaveText(/^\d{1,2}[:.]\d{2}/)
    expect(await line.locator('.uh-clk-time').evaluate((el) => getComputedStyle(el).fontFamily)).toMatch(/Geist Mono|monospace/)
    await expect(page.locator('.uh-today-clock'), 'the big clock is hidden on a phone').toBeHidden()
  })

  test('below 360px the line drops the weekday', async ({ page }) => {
    watch(page, 'a designer on a small phone')
    await open(page, { width: 340, height: 700 })
    const line = page.locator('.uh-clock-line')
    await expect(line.locator('.uh-clk-long')).toBeHidden()
    await expect(line.locator('.uh-clk-short')).toBeVisible()
    const weekday = await page.evaluate(() => new Date().toLocaleDateString([], { weekday: 'long' }))
    expect(await line.evaluate((el) => el.innerText)).not.toContain(weekday)
  })

  for (const size of [SIZES[1], SIZES[2]]) {
    test(`at ${size.width}px the big clock stays in Today and the phone's date line is not drawn`, async ({ page }) => {
      watch(page, 'a designer on a wider screen')
      await open(page, size)
      await expect(page.locator('.uh-today-clock')).toBeVisible()
      await expect(page.locator('.uh-clock-slot')).toBeHidden()
    })
  }

  test('the hour has no leading zero', async ({ page }) => {
    watch(page, 'a visitor opening the workspace at five past seven')
    await page.setViewportSize({ width: phone.width, height: phone.height })
    await page.clock.setFixedTime(new Date(2026, 9, 27, 7, 5))
    await go(page, '/projects')
    await expectRendered(page, '/projects')
    await expect(page.locator('.uh-clk-time')).toHaveText(/^7[:.]05/)
    await page.setViewportSize({ width: 1440, height: 900 })
    await expect(page.locator('.uh-today-time')).toHaveText(/^7[:.]05/)
  })

  test('with projects New project is one outlined button under the work; the title row\'s copy is not drawn', async ({ page }) => {
    watch(page, 'a designer on a phone with work on the page')
    await open(page, phone)
    // Both are in the page; one is drawn, and it is the only one a screen reader or the Tab key meets.
    expect(await page.locator('.uh-new').count()).toBe(2)
    await expect(page.getByRole('button', { name: 'New project' })).toHaveCount(1)
    const where = await page.evaluate(() => {
      const el = [...document.querySelectorAll('.uh-new')].find((b) => b.getBoundingClientRect().width > 0)
      const r = el.getBoundingClientRect()
      const q = (s) => document.querySelector(s).getBoundingClientRect()
      return { top: r.top, bottom: r.bottom, width: Math.round(r.width), rows: q('.uh-rows').bottom, today: q('.uh-today').top, filled: el.classList.contains('is-filled'), inFoot: !!el.closest('.uh-new-wrap--foot') }
    })
    expect(where.inFoot, 'the drawn New project is the one under the work').toBe(true)
    expect(where.top, 'it is above the last row').toBeGreaterThanOrEqual(where.rows - 1)
    expect(where.bottom, 'it is below Today').toBeLessThanOrEqual(where.today + 1)
    expect(where.width, 'it is full width').toBe(phone.width - 24)
    expect(where.filled, 'it is the outlined one').toBe(false)
    expect(await filledOnFirstScreen(page)).toEqual(['Check the contrast, Violet Lime'])
  })

  test('signed out New project is one filled button under the date', async ({ page }) => {
    watch(page, 'a visitor on a phone')
    await page.setViewportSize({ width: phone.width, height: phone.height })
    await go(page, '/projects')
    await expectRendered(page, '/projects')
    expect(await page.locator('.uh-new').count(), 'a visitor has no work to put it under').toBe(1)
    const b = await page.evaluate(() => {
      const el = document.querySelector('.uh-new')
      const r = el.getBoundingClientRect()
      return { top: r.top, filled: el.classList.contains('is-filled'), width: Math.round(r.width), line: document.querySelector('.uh-clock-line').getBoundingClientRect().bottom }
    })
    expect(b.filled).toBe(true)
    expect(b.top, 'it is not under the date line').toBeGreaterThanOrEqual(b.line - 1)
    expect(b.width).toBe(phone.width - 24)
  })

  test('Start something is four tools and an "All thirteen tools" row', async ({ page }) => {
    watch(page, 'a designer reaching for a tool on a phone')
    await open(page, phone)
    const start = page.locator('.uh-start')
    await expect(start.locator('a.uh-tool:visible')).toHaveText([/^Gradient/, /^Tint/, /^Contrast/, /^Icon set/])
    const all = start.locator('.uh-tool--all')
    await expect(all).toBeVisible()
    await expect(all).toHaveText('All thirteen tools')
    await expect(all).toHaveAttribute('aria-haspopup', 'menu')
    await expect(start.locator('.uh-alltools'), 'the heading\'s button gives way to the row').toBeHidden()
    const heights = await start.locator('.uh-tool:visible').evaluateAll((els) => els.map((el) => Math.round(el.getBoundingClientRect().height)))
    expect(heights.length).toBe(5)
    expect(Math.min(...heights), `a tool row is under 56px: ${heights}`).toBeGreaterThanOrEqual(56)
  })

  for (const size of [SIZES[1], SIZES[2]]) {
    test(`at ${size.width}px Start something shows all six tools and no phone row`, async ({ page }) => {
      watch(page, 'a designer on a wider screen')
      await open(page, size)
      await expect(page.locator('.uh-start a.uh-tool:visible')).toHaveCount(6)
      await expect(page.locator('.uh-tool--all')).toBeHidden()
      await expect(page.locator('.uh-alltools')).toBeVisible()
    })
  }
})

test.describe('on a tablet, Today is one row', () => {
  for (const width of [641, 768, 1000]) {
    test(`at ${width}px the date and time sit beside the meters, and the plan line runs under both`, async ({ page }) => {
      watch(page, `a designer on a ${width}px screen`)
      await open(page, { width, height: 1024 })
      const b = {}
      for (const sel of ['.uh-today-clock', '.uh-meters', '.uh-plan-line', '.uh-today']) b[sel] = await box(page, sel)
      expect(b['.uh-meters'].left, 'the meters are not to the right of the clock').toBeGreaterThanOrEqual(b['.uh-today-clock'].right)
      expect(Math.abs(b['.uh-meters'].top - b['.uh-today-clock'].top), 'the two do not start on one line').toBeLessThanOrEqual(8)
      expect(b['.uh-plan-line'].top, 'the plan line is not under both').toBeGreaterThanOrEqual(Math.max(b['.uh-today-clock'].bottom, b['.uh-meters'].bottom) - 1)
    })
  }

  test('at 640px it stacks again, with the phone\'s date line in place of the clock', async ({ page }) => {
    watch(page, 'a designer on the widest phone')
    await open(page, { width: 640, height: 900 })
    await expect(page.locator('.uh-today-clock')).toBeHidden()
    await expect(page.locator('.uh-clock-line')).toBeVisible()
  })

  test('at 1001px the rail is back and Today stacks inside it', async ({ page }) => {
    watch(page, 'a designer on the narrowest laptop')
    await open(page, { width: 1001, height: 900 })
    const b = {}
    for (const sel of ['.uh-today-clock', '.uh-meters', '.uh-dash-main > .uh-continue', '.uh-today']) b[sel] = await box(page, sel)
    expect(b['.uh-today'].left, 'Today is not in the rail beside the work').toBeGreaterThanOrEqual(b['.uh-dash-main > .uh-continue'].right)
    expect(b['.uh-meters'].top, 'the meters are not under the clock').toBeGreaterThanOrEqual(b['.uh-today-clock'].bottom - 1)
  })
})

test.describe('the starter\'s steps', () => {
  for (const size of SIZES) {
    test(`at ${size.width}px are one column of numbered, underlined links in the accent`, async ({ page }) => {
      watch(page, 'a new account reading the walkthrough')
      await open(page, size, { projects: [] })
      const steps = await page.getByTestId('starter-card').getByRole('list', { name: 'The walkthrough' }).evaluate((ol) => {
        const probe = document.createElement('i')
        probe.style.color = 'var(--ws-acc-text)'
        ol.append(probe)
        const accent = getComputedStyle(probe).color
        probe.remove()
        return {
          tag: ol.tagName,
          marker: getComputedStyle(ol).listStyleType,
          rows: [...ol.querySelectorAll('li')].map((li) => {
            const r = li.getBoundingClientRect()
            const a = li.querySelector('a')
            const cs = getComputedStyle(a)
            return { top: Math.round(r.top), left: Math.round(r.left), underline: cs.textDecorationLine, accent: cs.color === accent }
          }),
        }
      })
      expect(steps.tag).toBe('OL')
      expect(steps.marker, 'the steps are a numbered sequence').toBe('decimal')
      expect(steps.rows).toHaveLength(4)
      for (let i = 1; i < steps.rows.length; i++) {
        expect(steps.rows[i].top, `step ${i + 1} is not under step ${i}`).toBeGreaterThan(steps.rows[i - 1].top)
        expect(steps.rows[i].left, `step ${i + 1} is not in the same column`).toBe(steps.rows[0].left)
      }
      expect(steps.rows.map((r) => r.underline), 'a link is not underlined').toEqual(Array(4).fill('underline'))
      expect(steps.rows.map((r) => r.accent), 'a link is not the accent colour').toEqual(Array(4).fill(true))
    })
  }
})

test.describe('no text is smaller than 13px', () => {
  const sweep = (page) => page.evaluate(() => {
    const small = []
    let seen = 0
    const walker = document.createTreeWalker(document.querySelector('.uh'), NodeFilter.SHOW_TEXT)
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      if (!n.textContent.trim()) continue
      const el = n.parentElement
      const r = el.getBoundingClientRect()
      if (!r.width || !r.height || el.closest('.uh-sr')) continue
      seen += 1
      const px = parseFloat(getComputedStyle(el).fontSize)
      if (px < 13) small.push(`${px}px "${n.textContent.trim().slice(0, 30)}"`)
    }
    return { seen, small }
  })
  for (const size of SIZES) {
    for (const [label, opts] of [['with projects', {}], ['with none', { projects: [] }], ['all archived', { projects: ALL_ARCHIVED }]]) {
      test(`${label}, at ${size.width}px`, async ({ page }) => {
        watch(page, `a designer reading the page ${label}`)
        await withExports(page)
        await open(page, size, opts)
        const r = await sweep(page)
        expect(r.seen, 'the sweep found no text').toBeGreaterThan(40)
        expect(r.small, 'text under 13px').toEqual([])
      })
    }
  }
  test('signed out, at 390px', async ({ page }) => {
    watch(page, 'a visitor reading the page')
    await page.setViewportSize({ width: 390, height: 844 })
    await go(page, '/projects')
    await expectRendered(page, '/projects')
    const r = await sweep(page)
    expect(r.seen, 'the sweep found no text').toBeGreaterThan(30)
    expect(r.small, 'text under 13px').toEqual([])
  })
})

test.describe('the greeting holds its place', () => {
  test('the title does not move while the greeting settles', async ({ page }) => {
    watch(page, 'a designer whose page is still loading its profile')
    await page.addInitScript(() => {
      window.__h1Tops = new Set()
      const sample = () => {
        const h1 = document.querySelector('.uh-h1')
        if (h1) window.__h1Tops.add(Math.round(h1.getBoundingClientRect().top + scrollY))
        requestAnimationFrame(sample)
      }
      requestAnimationFrame(sample)
    })
    await open(page, SIZES[0], { creationTime: Date.now() - 11 * MINUTE })
    await expect(page.getByTestId('greeting')).toHaveText('Welcome back, Freya.')
    const tops = await page.evaluate(() => [...window.__h1Tops])
    expect(tops.length, 'the title was never sampled').toBeGreaterThan(0)
    expect(tops, `the title was at ${tops.join(', ')}`).toHaveLength(1)
  })
})
