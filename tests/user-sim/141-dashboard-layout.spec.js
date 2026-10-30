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
//         Recent exports, then Start something, Discover, Pro.
//   390   The same, except Recent exports follows Discover: Today, Start something,
//         Discover, Recent exports, Pro.
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
//   projects.css   `.uh .uh-tools { min-width: 520px }`     -> "no horizontal overflow" (the 390 case; was `.uh-quick`, retired)
// Round 2 (same method; all made in one build, each named test went red, then restored):
//   StarterCard    heading always 'Start your first project'      -> "when every project is archived the starter leads"
//   ProjectRows    drop 'Colour not set · ' from the row            -> "a row whose Colour is not set draws a dashed empty box"
//   ProjectRows    `collapsible = false`                            -> "past six projects five rows show"
//   DiscoverPicks  drop ' · Pro' from the locked meta               -> "a locked Discover card says what it is"
//   LocalClock     hour: '2-digit'                                  -> "the hour has no leading zero"
//   projects.css   remove `.uh-new-wrap--head.is-after-work { display: none }` -> "New project is one outlined button under the work"
//   StarterCard    wrap each step's label in <Link to=...>          -> "the starter's steps are one column ... not links" (3 sizes) and "an account with no projects"
//   projects.css   `.uh .uh-steps li` min-height/line-height 44px    -> "the starter's steps are one column ... not links" (32px rows)
//   projects.css   `.uh-clock-line` font-size 12px                  -> "no text is smaller than 13px" (390 cases)
//   projects.css   `.uh-today { display: block }` at 641-1000      -> "on a tablet, Today is one row"
//   projects.css   drop the phone's hide rule for Semantic -> "Start something is five tool rows"
//   projects.css   drop the phone's `.uh-today-clock` hide          -> "the date and time are one line under the title"
//   useProjectIcons  writeIcon without { touch: false }              -> 52 "choosing an icon for an older project ..."
//   Projects.jsx   StarterCard without `limit`                      -> "when archived projects already fill the Free plan ..."
// Round 3 (the blurred locked cards; made in one build, each named test went red, then restored):
//   DiscoverPicks  label text back to 'Pro palette. Opens with Pro'  -> "a locked Discover card says what it is, shows the blurred picture ..."
//   DiscoverPicks  drop the picture's onError                        -> "when the picture cannot be had the card says so in text ..."
//   preview.js     a tEXt chunk holding the hex codes                 -> tests/unit/palette-preview-png.test.js "no hex string of the palette is in the bytes"
import { test, expect } from './base.js'
import { go, watch, expectRendered, signIn } from './helpers.js'
import { DEFAULT_DESIGN } from '../../src/data/designDefaults.js'
import { LIBRARY_PALETTES } from '../../api/_lib/library/paletteLibrary.js'
import { decodePng, hexNeedles } from '../helpers/png.js'

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

/** The face and number style a figure is drawn in: the Today card has one sans, tabular, and nothing mono. */
const figureStyle = (locator) => locator.evaluate((el) => {
  const cs = getComputedStyle(el)
  return { family: cs.fontFamily, numeric: cs.fontVariantNumeric }
})
function expectSansTabular(style, what) {
  expect(style.family, `${what} is not the mono face (${style.family})`).not.toMatch(/Geist Mono|monospace/i)
  expect(style.family, `${what} is the page's sans face (${style.family})`).toMatch(/Switzer/)
  expect(style.numeric, `${what} has tabular figures (${style.numeric})`).toContain('tabular-nums')
}

for (const size of SIZES) {
  test.describe(`the workspace at ${size.width}px (${size.name})`, () => {
    test('sections run in this order, in the DOM and on the page', async ({ page }) => {
      watch(page, `a designer reading down their workspace on a ${size.name}`)
      await withExports(page)
      await open(page, size)

      // The rail follows the work in the DOM and is placed beside it by the grid at 1001px and up. On a
      // phone (640 and under) Recent exports is mounted after Discover instead, as the spec orders it.
      const ORDER = size.width <= 640
        ? ['.uh-greet', '.uh-h1', '.uh-dash-main > .uh-continue', '.uh-rows', '.uh-today', '.uh-start', '.uh-disc-head', '.uh-exports', '.uh-pro']
        : ['.uh-greet', '.uh-h1', '.uh-dash-main > .uh-continue', '.uh-rows', '.uh-today', '.uh-exports', '.uh-start', '.uh-disc-head', '.uh-pro']
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
      }
      // Recent exports shows four at every width, stacked or beside the rail, of the six seeded.
      await expect(page.locator('.uh-export:visible')).toHaveCount(4)
    })

    test('the lead card is the newest project that is not archived', async ({ page }) => {
      watch(page, 'a designer picking up their last project')
      await open(page, size)

      const lead = page.locator('.uh-dash-main > .uh-continue')
      await expect(lead.locator('.uh-continue-name')).toHaveText('Violet Lime')
      await expect(lead.locator('.uh-meta'), 'Ready, two hours ago: from the saved design and its age').toHaveText('Ready · Edited 2 hours ago')
      await expect(lead, 'the archived project is newer, and must not lead').not.toContainText('Old Harbour')
      // THE LEAD PLATE IS THE PROJECT'S OWN FIVE COLOURS, in order: a drawn plate in the /tools frame
      // (.spt-art), one painted column per colour. Read as drawn (computed fill), and as saved (the attribute).
      const plate = lead.locator('.spt-art[data-hue="none"]')
      await expect(plate, 'the lead holds one drawn plate').toHaveCount(1)
      expect(await plate.locator('rect.spt-step').evaluateAll((r) => r.map((x) => getComputedStyle(x).fill)))
        .toEqual(['rgb(26, 11, 46)', 'rgb(75, 31, 158)', 'rgb(139, 92, 246)', 'rgb(201, 242, 77)', 'rgb(245, 243, 255)'])
      expect(await plate.locator('rect.spt-step').evaluateAll((r) => r.map((x) => x.getAttribute('fill').toUpperCase())), 'the columns are the saved hex values')
        .toEqual(['#1A0B2E', '#4B1F9E', '#8B5CF6', '#C9F24D', '#F5F3FF'])
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
      // Four numbered tool plates (the tools that build each part, in the walkthrough's order).
      await expect(starter.locator('.uh-steps li .uh-step-label'), 'the plates carry their own letters, so read the label under each').toHaveText(['1 Colour', '2 Type', '3 Type scale', '4 Tints'])
      await expect(starter.getByRole('list', { name: 'The walkthrough' }).getByRole('listitem')).toHaveCount(4)
      expect(await starter.locator('.uh-steps li').evaluateAll((lis) => lis.map((li) => li.querySelector('.spt-art')?.getAttribute('data-art'))), 'each step draws its tool\'s plate')
        .toEqual(['palette', 'font-pair', 'type-scale', 'tint'])
      // The steps are text: Start the walkthrough is the way in, so the list holds no link.
      await expect(starter.getByRole('list', { name: 'The walkthrough' }).getByRole('link'), 'a step is a link again').toHaveCount(0)
      // No lead, no rows, and it is the first block under the title.
      await expect(page.locator('.uh-rows')).toHaveCount(0)
      await expect(page.locator('.uh-dash-main > .uh-continue')).toHaveCount(1)
      const s = await box(page, '[data-testid="starter-card"]')
      const h = await box(page, '.uh-h1')
      const start = await box(page, '.uh-start')
      expect(s.top, 'the starter is not under the title').toBeGreaterThanOrEqual(h.bottom - 1)
      expect(start.top, 'Start something is above the starter').toBeGreaterThanOrEqual(s.bottom - 1)
      // The four plates sit four across from 768 up and two by two on a phone (spec 5.3), all one size.
      const cells = await starter.locator('.uh-steps li').evaluateAll((a) => a.map((x) => { const r = x.getBoundingClientRect(); return { left: Math.round(r.left), top: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height) } }))
      expect(new Set(cells.map((c) => c.left)).size, `plates per row: ${JSON.stringify(cells)}`).toBe(size.width >= 768 ? 4 : 2)
      expect(new Set(cells.map((c) => c.top)).size, `rows of plates: ${JSON.stringify(cells)}`).toBe(size.width >= 768 ? 1 : 2)
      expect(new Set(cells.map((c) => `${c.w}x${c.h}`)).size, `the plates are not one size: ${JSON.stringify(cells)}`).toBe(1)
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

    // One filled (ink pill) control in the page body on the first screen: Continue. New project is outlined.
    expect(await filledOnFirstScreen(page), 'more than one filled button on the first screen').toEqual(['Check the contrast, Violet Lime'])
  })

  // The spec's "one filled button on the first screen", at each width and in each state: Continue when
  // there is a project, Start the walkthrough when there is none, New project when signed out.
  for (const size of SIZES) {
    for (const [label, opts, only] of [
      ['with a project', {}, 'Check the contrast, Violet Lime'],
      ['with no project', { projects: [] }, 'Start the walkthrough'],
    ]) {
      test(`${label}, at ${size.width}x${size.height} the first screen holds one filled button, and it is ${only}`, async ({ page }) => {
        watch(page, `a designer opening their workspace on a ${size.name}, ${label}`)
        await open(page, size, opts)
        expect(await filledOnFirstScreen(page), 'the filled buttons on the first screen').toEqual([only])
      })
    }
    test(`signed out, at ${size.width}x${size.height} the first screen holds one filled button, and it is New project`, async ({ page }) => {
      watch(page, `a visitor opening the workspace on a ${size.name}`)
      await page.setViewportSize({ width: size.width, height: size.height })
      await go(page, '/projects')
      await expectRendered(page, '/projects')
      expect(await filledOnFirstScreen(page), 'the filled buttons on the first screen').toEqual(['New project'])
    })
  }

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

/**
 * Every FILLED control that starts on the first screen, by the name a person would give it. Filled is
 * what a person sees: a link or button in the page body whose own background is opaque. (The page's fill
 * is the ink pill; it used to be the accent colour, so this no longer looks for one colour.) Outlined
 * pills, ruled rows and text links have no background of their own and are not counted.
 */
const filledOnFirstScreen = (page) => page.evaluate(() => {
  const opaque = (css) => {
    const m = css.match(/rgba?\(([^)]+)\)/)
    if (!m) return false
    const parts = m[1].split(/[ ,/]+/).filter(Boolean)
    return parts.length < 4 || parseFloat(parts[3]) >= 0.9
  }
  return [...document.querySelectorAll('.uh a[href], .uh button')]
    .filter((el) => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0 && r.top < innerHeight && opaque(getComputedStyle(el).backgroundColor) })
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

    test('when archived projects already fill the Free plan, the starter offers the plans, not a walkthrough that is refused', async ({ page }) => {
      watch(page, 'a Free designer whose three projects are all archived')
      await open(page, size, { projects: [...ALL_ARCHIVED, { ...half('p-third', 'Third Archive', ago(90 * MINUTE)), archived: true }] })

      const starter = page.getByTestId('starter-card')
      await expect(starter.getByRole('heading', { level: 2, name: 'Your Free plan is full' })).toBeVisible()
      await expect(starter).toContainText("archived projects count toward the Free plan's 3. Open one below to delete it")
      await expect(starter.getByRole('list', { name: 'The walkthrough' }), 'no steps to start when nothing can start').toHaveCount(0)
      await expect(starter.getByRole('link', { name: 'See plans' })).toHaveAttribute('href', '/plans')
      await expect(starter.getByRole('button', { name: 'Start the walkthrough' }), 'the walkthrough would only hit the cap').toHaveCount(0)
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
      // (The plate replaced the dashed empty box on purpose, spec 5.4: an unset Colour is an empty plate frame, never a dashed box.)
      const swatches = await rows.locator('.uh-plate').evaluateAll((els) => els.map((el) => ({
        stops: el.querySelectorAll('rect.spt-step').length,
        border: getComputedStyle(el).borderTopStyle,
      })))
      expect(swatches).toEqual([{ stops: 4, border: 'none' }, { stops: 0, border: 'none' }])
      // Both plates are the same size, so the rows still line up.
      const sizes = await rows.locator('.uh-plate').evaluateAll((els) => els.map((el) => { const b = el.getBoundingClientRect(); return `${Math.round(b.width)}x${Math.round(b.height)}` }))
      expect(sizes[0]).toBe(sizes[1])
    })

    test('a lead whose Colour is not set says so and offers to build the palette', async ({ page }) => {
      watch(page, 'a designer whose only project has no palette')
      await open(page, size, { projects: [bare()] })
      const lead = page.locator('.uh-dash-main > .uh-continue')
      await expect(lead.locator('.uh-plate rect.spt-step'), 'the default palette is drawn as the project\'s own').toHaveCount(0)
      const empty = lead.locator('.uh-plate-empty')
      await expect(empty).toContainText('Colour not set.')
      await expect(empty.getByRole('link', { name: 'Build the palette' })).toHaveAttribute('href', '/create/palette')
      // The words sit inside the plate's frame (spec 5.2): the frame stays, it is not a dashed box.
      const inside = await page.evaluate(() => {
        const p = document.querySelector('.uh-dash-main > .uh-continue .uh-plate').getBoundingClientRect()
        const t = document.querySelector('.uh-dash-main > .uh-continue .uh-plate-empty').getBoundingClientRect()
        return t.left >= p.left - 1 && t.right <= p.right + 1 && t.top >= p.top - 1 && t.bottom <= p.bottom + 1
      })
      expect(inside, 'Colour not set sits inside the plate').toBe(true)
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

    test('a locked Discover card says what it is, shows the blurred picture, and carries no colour of its own', async ({ page }) => {
      watch(page, 'a free designer looking at what is new in Discover')
      await open(page, size)
      const locked = page.locator('.uh-disc-card.is-locked')
      const count = await locked.count()
      expect(count, 'no locked card on a free account: the sweep measured nothing').toBeGreaterThan(0)
      // The pictures load as they come into view; wait for each card to say it has its picture.
      await page.locator('.uh-disc').scrollIntoViewIfNeeded()
      await expect(page.locator('.uh-disc-lock.is-ready'), 'a locked card\'s picture did not arrive').toHaveCount(count)
      const cards = await locked.evaluateAll((els) => els.map((el) => {
        const img = el.querySelector('.uh-disc-lock > img.uh-disc-blur')
        const label = el.querySelector('.uh-disc-lock-label')
        const lb = label?.getBoundingClientRect()
        const lock = el.querySelector('.uh-disc-lock')?.getBoundingClientRect()
        return {
          label: label?.textContent?.trim(),
          name: el.querySelector('.uh-disc-name')?.textContent?.trim(),
          meta: el.querySelector('.uh-disc-meta')?.textContent?.trim(),
          accessible: el.getAttribute('aria-label'),
          strips: el.querySelectorAll('.uh-disc-strip, .uh-disc-strip--locked').length,
          painted: [...el.querySelectorAll('[style]')].length,
          note: !!el.querySelector('.uh-disc-note'),
          picture: img && { src: img.getAttribute('src'), alt: img.getAttribute('alt'), natural: `${img.naturalWidth}x${img.naturalHeight}`, opacity: getComputedStyle(img).opacity },
          labelOnPicture: !!(lb && lock && lb.left >= lock.left - 1 && lb.right <= lock.right + 1 && lb.top >= lock.top - 1 && lb.bottom <= lock.bottom + 1),
        }
      }))
      for (const c of cards) {
        expect(c.label).toBe('Opens with Pro')
        expect(c.meta, `${c.name}: the meta line`).toMatch(/^\d+ colours? · Pro$/)
        expect(c.accessible, 'the link name contains what is shown, plus what it is').toBe(`${c.name}, Pro palette, opens with Pro`)
        expect(c.strips, `${c.name} draws a stand-in strip`).toBe(0)
        expect(c.painted, `${c.name} paints something inline`).toBe(0)
        expect(c.note, `${c.name} shows the text fallback although its picture arrived`).toBe(false)
        expect(c.picture.src, `${c.name}: where the picture comes from`).toMatch(/^\/api\/ai\?palettePreview=[\w%.-]+$/)
        expect(c.picture.alt, 'the picture is decoration; the card\'s name says what it is').toBe('')
        expect(c.picture.natural, `${c.name}: the picture the server sent`).toBe('320x74')
        expect(c.labelOnPicture, `${c.name}: the label sits on the picture`).toBe(true)
      }
      await expect(page.getByRole('link', { name: `${cards[0].name}, Pro palette, opens with Pro` })).toHaveAttribute('href', '/discover/palettes')
      // The picture fades in (150ms) once it has loaded; it ends fully opaque.
      await expect.poll(() => page.locator('.uh-disc-blur').evaluateAll((imgs) => imgs.map((i) => getComputedStyle(i).opacity)), 'the pictures fade in')
        .toEqual(Array(count).fill('1'))
    })

    test('when the picture cannot be had the card says so in text and draws no box', async ({ page }) => {
      watch(page, 'a free designer whose network drops the blurred pictures')
      await page.setViewportSize({ width: size.width, height: size.height })
      await signIn(page, { plan: 'free', projects: THREE })
      // Registered after signIn's own route for the pictures, so it answers first.
      await page.route(/\/api\/ai\?palettePreview=/, (route) => route.abort('failed'))
      await go(page, '/projects')
      await expectRendered(page, '/projects')
      const locked = page.locator('.uh-disc-card.is-locked')
      const count = await locked.count()
      expect(count, 'no locked card on a free account: the sweep measured nothing').toBeGreaterThan(0)
      await page.locator('.uh-disc').scrollIntoViewIfNeeded()
      await expect(page.locator('.uh-disc-note')).toHaveCount(count)
      await expect(page.locator('.uh-disc-note')).toHaveText(Array(count).fill('Pro palette'))
      await expect(page.locator('.uh-disc-lock'), 'the strip is dropped with the picture').toHaveCount(0)
      await expect(page.locator('.uh-disc-blur')).toHaveCount(0)
      // Still a card that names the palette and links to the library.
      await expect(locked.first().locator('.uh-disc-name')).not.toHaveText('')
      await expect(locked.first()).toHaveAttribute('href', '/discover/palettes')
    })

    test('no colour of a locked palette is anywhere in the Discover section, the page, or the picture', async ({ page }) => {
      watch(page, 'a free designer whose page must not hold a paid palette')
      // No projects: their own strips are the page's colours, and a library palette can share them (the fixture's Violet Lime does).
      await open(page, size, { projects: [] })
      await page.locator('.uh-disc').scrollIntoViewIfNeeded()
      const ids = await page.locator('.uh-disc-card.is-locked .uh-disc-blur').evaluateAll((imgs) => imgs.map((i) => new URL(i.src).searchParams.get('palettePreview')))
      expect(ids.length, 'no locked card to look for').toBeGreaterThan(0)
      const palettes = ids.map((id) => LIBRARY_PALETTES.find((p) => p.id === id))
      expect(palettes.every(Boolean), 'a locked card names a palette the library does not hold').toBe(true)
      const names = await page.locator('.uh-disc-card.is-locked .uh-disc-name').allInnerTexts()
      expect(names, 'the picture and the name belong to the same palette').toEqual(palettes.map((p) => p.name))

      // Greys and white are half the stylesheet, so only the chromatic colours can tell a leak from the
      // page's own ink; the Discover section itself holds no hex at all, so there every colour is looked for.
      const chromatic = (h) => Math.max(...[1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16))) - Math.min(...[1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16))) >= 24
      const everyHex = [...new Set(palettes.flatMap((p) => p.colors.map((c) => c.toUpperCase())))]
      const chromaticHex = everyHex.filter(chromatic)
      expect(chromaticHex.length, 'the locked palettes have no chromatic colour to look for').toBeGreaterThan(0)

      // 1. The page. The section's markup and painted colours, and the whole document's markup.
      const inPage = await page.evaluate(({ every, chroma }) => {
        const section = document.querySelector('.uh-disc')
        const sectionHtml = section.outerHTML.toUpperCase()
        const pageHtml = document.documentElement.outerHTML.toUpperCase()
        const rgb = (h) => `RGB(${parseInt(h.slice(1, 3), 16)}, ${parseInt(h.slice(3, 5), 16)}, ${parseInt(h.slice(5, 7), 16)})`
        const painted = new Set()
        for (const el of section.querySelectorAll('*')) {
          const cs = getComputedStyle(el)
          for (const v of [cs.backgroundColor, cs.color, cs.borderTopColor, cs.borderBottomColor]) painted.add(v.toUpperCase())
        }
        return {
          section: every.filter((h) => sectionHtml.includes(h) || sectionHtml.includes(h.slice(1))),
          document: chroma.filter((h) => pageHtml.includes(h) || pageHtml.includes(rgb(h))),
          painted: chroma.filter((h) => painted.has(rgb(h))),
        }
      }, { every: everyHex, chroma: chromaticHex })
      expect(inPage, 'a locked palette\'s colours are on the page').toEqual({ section: [], document: [], painted: [] })

      // 2. The picture, fetched the way the card fetches it. Fetch from the page so it goes through the
      // same route; read the bytes back and look for each hex as text, in either case, with or without #.
      for (const palette of palettes) {
        const got = await page.evaluate(async (src) => {
          const r = await fetch(src)
          const b = new Uint8Array(await r.arrayBuffer())
          let s = ''
          for (let i = 0; i < b.length; i += 1) s += String.fromCharCode(b[i])
          return { status: r.status, type: r.headers.get('content-type'), b64: btoa(s) }
        }, `/api/ai?palettePreview=${encodeURIComponent(palette.id)}`)
        expect(got.status, `${palette.name}: the picture's status`).toBe(200)
        expect(got.type, `${palette.name}: the picture's type`).toBe('image/png')
        const bytes = Buffer.from(got.b64, 'base64')
        const picture = decodePng(bytes) // throws if it is not a PNG, or a chunk's CRC is wrong
        expect([picture.width, picture.height]).toEqual([320, 74])
        // POSITIVE CONTROL: the byte search can find text in this file.
        expect(bytes.includes(Buffer.from('IHDR', 'ascii'))).toBe(true)
        for (const hex of palette.colors) {
          for (const needle of hexNeedles(hex)) {
            expect(bytes.includes(Buffer.from(needle, 'ascii')), `${palette.name}: ${needle} is in the picture's bytes`).toBe(false)
          }
        }
      }
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

// The meta line has one form across the row: "<mood>, N colours" on every card, or "N colours" on every card.
// Never a mix. A locked card has no colours to classify, so a row with one is "N colours" throughout.
const discoverMetas = (page) => page.locator('.uh-disc-card .uh-disc-meta').evaluateAll((els) => els.map((el) => el.textContent.trim()))
const hasMood = (meta) => /^[A-Za-z][\w -]*, \d+ colours?$/.test(meta)

test.describe('Discover shows a mood on every card or on none', () => {
  for (const size of SIZES) {
    test(`at ${size.width}px a free account's row is N colours throughout`, async ({ page }) => {
      watch(page, 'a free designer looking at what is new in Discover')
      await open(page, size)
      await page.locator('.uh-disc').scrollIntoViewIfNeeded()
      await expect(page.locator('.uh-disc-card')).toHaveCount(4)
      expect(await page.locator('.uh-disc-card.is-locked').count(), 'no locked card on a free account: the row cannot mix').toBeGreaterThan(0)
      const metas = await discoverMetas(page)
      expect(metas.filter(hasMood), `a card shows a mood next to a card that cannot: ${JSON.stringify(metas)}`).toEqual([])
      // Pins the free fixture's form. It cannot tell a mixed row from a uniform one while all four cards are locked
      // (tried: the per-card mood code stays green here); the Pro tests below, with a library we supply, are the guard.
      // Locked cards say what they are after the count; a card that is held (if the fixture has one) is the bare count.
      for (const m of metas) expect(m, 'the meta is not "N colours"').toMatch(/^\d+ colours?( · Pro)?$/)
    })
  }

  // A Pro account is answered with a library of our choosing, so the moods are hand-checked strings:
  // classifyPalette gives these four Warm, Cool, Neutral and Warm (the first of its moods in the page's order),
  // and gives PRUSSIAN none at all (the library's own Prussian & Peach, which is among its four newest).
  const NEW = (id, name, colors, added) => ({ id, name, colors, added, kind: 'curated' })
  const WARM = ['#7A2E12', '#C4521E', '#F2A488', '#FDEDE4']
  const COOL = ['#0B2A45', '#1F4E79', '#5B9BD5', '#DCEBF7']
  const NEUTRAL = ['#2B2B2B', '#6B6B6B', '#B5B5B5', '#F2F2F2']
  const PRUSSIAN = ['#0B2A45', '#1F4E79', '#F2A488', '#FDEDE4']
  async function openProRow(page, rows) {
    await page.setViewportSize({ width: 1440, height: 900 })
    await signIn(page, { plan: 'pro', projects: THREE })
    // Registered after signIn's own route for the library, so it answers first.
    await page.route(/\/api\/ai\?library=palettes/, (route) => route.fulfill({
      status: 200, contentType: 'application/json', body: JSON.stringify({ kind: 'palettes', total: rows.length, items: rows }),
    }))
    await go(page, '/projects')
    await expectRendered(page, '/projects')
    await expect(page.locator('.uh-disc-card')).toHaveCount(4)
    return discoverMetas(page)
  }

  test('when every card has a mood, every card shows it — the control', async ({ page }) => {
    watch(page, 'a Pro designer whose newest palettes can all be classified')
    const metas = await openProRow(page, [
      NEW('a', 'Ember', WARM, '2026-09-04'), NEW('b', 'Tide', COOL, '2026-09-03'), NEW('c', 'Slate', NEUTRAL, '2026-09-02'), NEW('d', 'Clay', WARM, '2026-09-01'),
    ])
    expect(metas).toEqual(['Warm, 4 colours', 'Cool, 4 colours', 'Neutral, 4 colours', 'Warm, 4 colours'])
  })

  test('when one card has no mood, no card shows one', async ({ page }) => {
    watch(page, 'a Pro designer with one palette that has no mood among the newest')
    const metas = await openProRow(page, [
      NEW('a', 'Ember', WARM, '2026-09-04'), NEW('b', 'Tide', COOL, '2026-09-03'), NEW('c', 'Slate', NEUTRAL, '2026-09-02'), NEW('d', 'Prussian', PRUSSIAN, '2026-09-01'),
    ])
    expect(metas, 'the row mixes "Warm, 4 colours" with "4 colours"').toEqual(['4 colours', '4 colours', '4 colours', '4 colours'])
  })

  test('the library\'s own newest four are one form, whichever it is', async ({ page }) => {
    watch(page, 'a Pro designer looking at what is new in Discover')
    await open(page, SIZES[2], { plan: 'pro' })
    await expect(page.locator('.uh-disc-card')).toHaveCount(4)
    const metas = await discoverMetas(page)
    expect(new Set(metas.map(hasMood)).size, `the row mixes two forms: ${JSON.stringify(metas)}`).toBe(1)
  })
})

test.describe('the Today card and the chips share one style', () => {
  // MUTATION (made, named test red, restored): projects.css `.uh-today-time` and `.uh-meter-val` back to
  // `font-family: var(--mono)` -> the figures test; the dark `.uh-lead-ico, .uh-tool-ico` rule removed -> the chips test.
  test('the clock and both meter values are the sans face with tabular figures', async ({ page }) => {
    watch(page, 'a designer reading the Today card on a laptop')
    await open(page, SIZES[2])
    const today = page.locator('.uh-today')
    expectSansTabular(await figureStyle(today.locator('.uh-today-time')), 'the big clock')
    await expect(today.locator('.uh-today-time')).toHaveText(/\d{1,2}[:.]\d{2}/)
    const ai = today.locator('.uh-meter', { hasText: 'AI generations today' }).locator('.uh-meter-val')
    await expect(ai).toHaveText(/^\d+ of \d+$/)
    expectSansTabular(await figureStyle(ai), 'the AI value')
    const projects = today.getByTestId('project-quota-note').locator('.uh-meter-val')
    await expect(projects).toHaveText('3 of 3')
    expectSansTabular(await figureStyle(projects), '"3 of 3"')
  })

  test('in dark the tool and lead chips sit one step up from the card, level with the project badge', async ({ page }) => {
    watch(page, 'a designer on a laptop in dark')
    // RETIRED ON PURPOSE (spec 6): the tinted icon squares (.uh-tool-ico, .uh-lead-ico) went with the quick-tile
    // mosaic; the tools are /tools rows with drawn plates and the project badge has no tile. So the old
    // "chips one step up from the card" check protects nothing. What it guarded against, a tinted square coming
    // back, is now: none of the retired markup exists, and the badge has no fill of its own.
    await page.emulateMedia({ colorScheme: 'dark' })
    await open(page, SIZES[2])
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
    await expect(page.locator('.uh-start a.uh-tool'), 'the tool rows are drawn, so a zero below means something').not.toHaveCount(0)
    for (const gone of ['.uh-quick', '.uh-lead', '.uh-lead-ico', '.uh-tool-ico', '.uh-strip', '.uh-mini', '.uh-pro-eyebrow']) {
      await expect(page.locator(gone), `${gone} was retired`).toHaveCount(0)
    }
    expect(await page.locator('.uh-badge').first().evaluate((el) => getComputedStyle(el).backgroundColor), 'the badge is not a tinted square').toMatch(/rgba\(0, 0, 0, 0\)|transparent/)
  })
})

test.describe('on a phone, the page is composed for a thumb', () => {
  const phone = SIZES[0]

  test('the project-limit notice sits in the flow under New project, clear of the meters', async ({ page }) => {
    watch(page, 'a free designer at the project limit pressing New project on a phone')
    await open(page, phone)
    await expect(page.getByTestId('project-quota-note')).toContainText('3 of 3')
    // At 640 and under the head copy of New project is hidden and the one under the work is the button.
    const button = page.locator('.uh-new-wrap--foot .uh-new')
    await button.scrollIntoViewIfNeeded()
    await button.click()
    const refusal = page.getByTestId('project-create-refusal')
    await expect(refusal).toBeVisible()
    await expect(refusal.getByRole('link', { name: 'See plans' })).toBeVisible()
    const where = await page.evaluate(() => {
      const r = (s) => { const b = document.querySelector(s).getBoundingClientRect(); return { top: b.top + scrollY, bottom: b.bottom + scrollY, left: b.left, right: b.right } }
      return { button: r('.uh-new-wrap--foot .uh-new'), cap: r('[data-testid="project-create-refusal"]'), meters: r('.uh-meters'), position: getComputedStyle(document.querySelector('[data-testid="project-create-refusal"]')).position }
    })
    expect(where.cap.top, 'the notice starts above the bottom of the button').toBeGreaterThanOrEqual(where.button.bottom - 1)
    // No overlap with the meters: the notice ends before they start, or starts after they end.
    const overlaps = where.cap.top < where.meters.bottom - 1 && where.cap.bottom > where.meters.top + 1
      && where.cap.left < where.meters.right && where.cap.right > where.meters.left
    expect(overlaps, `the notice (${where.cap.top}-${where.cap.bottom}) covers the meters (${where.meters.top}-${where.meters.bottom})`).toBe(false)
    expect(where.cap.right, 'the notice runs off the right edge').toBeLessThanOrEqual(phone.width)
    expect(where.cap.left, 'the notice runs off the left edge').toBeGreaterThanOrEqual(0)
    expect(where.position, 'the notice floats over the page instead of sitting in it').toBe('static')
  })

  // The notice opens in the flow under the foot New project button. With the page scrolled to its foot that
  // button sits just above the fixed tab bar, so the notice would open under the bar unless the page moves.
  // The page's own scroll-padding-bottom (the tab bar's height, global.css) lands the notice flush on the bar;
  // projects.css adds 12px (`scroll-margin-bottom: var(--s-3)`) once. So the gap is 12px, not 0 and not bar + 12.
  // The scrollIntoView call is spied on from page start so the motion setting is read from the call itself
  // (`behavior`), not inferred from where the page ends up: both settings land on the same pixel.
  // MUTATION (made, named test red, restored):
  //   Projects.jsx   the `prefersReducedMotion() ? 'auto' : 'smooth'` ternary flipped    -> "motion on" and "reduced" (behavior)
  //   projects.css   scroll-margin-bottom back to calc(var(--tabbar-h) + env(...) + var(--s-3))  -> both (gap is 12 + bar, not 12)
  //   Projects.jsx   drop `ref={showCap}`                                                 -> both (no call; the notice is under the bar)
  for (const motion of ['on', 'reduced']) {
    test(`the limit notice ends above the tab bar when it opens from the page foot, motion ${motion}`, async ({ page }) => {
      watch(page, `a free designer at the foot of the page pressing New project, motion ${motion}`)
      // The Settings choice, as AppearanceContext stores it. The OS says "no preference" either way, so the
      // page's own setting is the only thing that differs between the two runs.
      await page.emulateMedia({ reducedMotion: 'no-preference' })
      await page.addInitScript((reduced) => {
        try { localStorage.setItem('vs-appearance', JSON.stringify({ reducedMotion: reduced })) } catch { /* private mode */ }
      }, motion === 'reduced')
      // Record every scrollIntoView aimed at the notice, then let the real one run.
      await page.addInitScript(() => {
        window.__capScrolls = []
        const real = Element.prototype.scrollIntoView
        Element.prototype.scrollIntoView = function (arg) {
          if (this.getAttribute && this.getAttribute('data-testid') === 'project-create-refusal') {
            window.__capScrolls.push({ behavior: arg && typeof arg === 'object' ? arg.behavior : undefined, block: arg && typeof arg === 'object' ? arg.block : undefined })
          }
          return real.apply(this, arguments)
        }
      })
      await open(page, phone)
      await expect(page.locator('html')).toHaveAttribute('data-reduced-motion', motion === 'reduced' ? 'true' : 'false')
      await expect(page.locator('html')).toHaveClass(/has-tabbar/)
      const button = page.locator('.uh-new-wrap--foot .uh-new')
      await expect(button).toBeVisible()
      // Scroll until the foot button's bottom edge is 8px above the tab bar: the thumb's position when it
      // reaches the end of the work. (The button is not at the end of the document; Discover and exports follow.)
      await page.evaluate(() => {
        const b = document.querySelector('.uh-new-wrap--foot .uh-new').getBoundingClientRect()
        const bar = document.querySelector('nav.pnav-tabs').getBoundingClientRect()
        window.scrollBy({ top: b.bottom - (bar.top - 8), behavior: 'instant' })
      })
      const place = () => page.evaluate(() => {
        const b = document.querySelector('.uh-new-wrap--foot .uh-new').getBoundingClientRect()
        return { gap: Math.round(document.querySelector('nav.pnav-tabs').getBoundingClientRect().top - b.bottom), top: Math.round(b.top) }
      })
      // The setup is the case the fix is for: the button is whole on the screen with the bar right under it.
      await expect.poll(async () => (await place()).gap).toBe(8)
      expect((await place()).top, 'the button is on the screen').toBeGreaterThan(0)
      await button.click()
      const notice = page.getByTestId('project-create-refusal')
      await expect(notice).toBeVisible()
      // Wait for any smooth scroll to finish: the scroll position holds still for several frames.
      await page.evaluate(() => new Promise((resolve) => {
        let last = -1, still = 0
        const tick = () => { still = scrollY === last ? still + 1 : 0; last = scrollY; still >= 8 ? resolve() : requestAnimationFrame(tick) }
        requestAnimationFrame(tick)
      }))
      const edges = await page.evaluate(() => ({
        noticeTop: document.querySelector('[data-testid="project-create-refusal"]').getBoundingClientRect().top,
        noticeBottom: document.querySelector('[data-testid="project-create-refusal"]').getBoundingClientRect().bottom,
        tabTop: document.querySelector('nav.pnav-tabs').getBoundingClientRect().top,
        tabPosition: getComputedStyle(document.querySelector('nav.pnav-tabs')).position,
        pill: (() => {
          const el = document.querySelector('.global-feedback-btn')
          if (!el || getComputedStyle(el).display === 'none') return null
          const r = el.getBoundingClientRect()
          return r.height ? { top: r.top, bottom: r.bottom } : null
        })(),
      }))
      expect(edges.tabPosition, 'the tab bar is the fixed one').toBe('fixed')
      // The notice lands 12px above whatever floats lowest over it: the Feedback
      // pill where it shows, otherwise the tab bar.
      const ceiling = edges.pill ? edges.pill.top : edges.tabTop
      const gap = ceiling - edges.noticeBottom
      expect(Math.abs(gap - 12), `the notice (bottom ${edges.noticeBottom}) ends ${gap}px above ${edges.pill ? 'the Feedback pill' : 'the tab bar'} (top ${ceiling}); it should be 12`).toBeLessThanOrEqual(1)
      const scrolls = await page.evaluate(() => window.__capScrolls)
      expect(scrolls, 'the notice asked to be scrolled into view once, as it mounted').toHaveLength(1)
      if (motion === 'on') expect(scrolls[0].behavior, 'with motion on the scroll glides').toBe('smooth')
      else expect(['auto', undefined], `with reduced motion the scroll jumps (behavior ${scrolls[0].behavior})`).toContain(scrolls[0].behavior)
      expect(edges.noticeTop, 'the notice is on the screen, not scrolled past the top').toBeGreaterThanOrEqual(0)
    })
  }

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
    // The weekday and month are the browser's own; the time is a clock reading in the page's sans, tabular.
    const expected = await page.evaluate(() => {
      const d = new Date()
      return { weekday: d.toLocaleDateString([], { weekday: 'long' }), month: d.toLocaleDateString([], { month: 'long' }) }
    })
    await expect(line).toContainText(expected.weekday)
    await expect(line).toContainText(expected.month)
    await expect(line.locator('.uh-clk-time')).toHaveText(/^\d{1,2}[:.]\d{2}/)
    expectSansTabular(await figureStyle(line.locator('.uh-clk-time')), 'the phone clock')
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
    expect(where.width, 'it is full width of the content column (20px gutters)').toBe(phone.width - 40)
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
    expect(b.width).toBe(phone.width - 40)
  })

  test('Start something is five tool rows and an "All thirteen tools" row', async ({ page }) => {
    watch(page, 'a designer reaching for a tool on a phone')
    await open(page, phone)
    const start = page.locator('.uh-start')
    await expect(start.locator('a.uh-tool:visible .uh-tool-name'), 'the Palette row, then the others the phone keeps (Semantic Colour gives way)').toHaveText(['Palette', 'Gradient', 'Tint', 'Contrast Checker', 'Icon Library'])
    const all = start.locator('.uh-tool--all')
    await expect(all).toBeVisible()
    await expect(all).toHaveText('All thirteen tools')
    await expect(all).toHaveAttribute('aria-haspopup', 'menu')
    await expect(start.locator('.uh-alltools'), 'the heading\'s button gives way to the row').toBeHidden()
    const heights = await start.locator('.uh-tool:visible').evaluateAll((els) => els.map((el) => Math.round(el.getBoundingClientRect().height)))
    expect(heights.length).toBe(6)
    expect(Math.min(...heights), `a tool row is under 56px: ${heights}`).toBeGreaterThanOrEqual(56)
  })

  for (const size of [SIZES[1], SIZES[2]]) {
    test(`at ${size.width}px Start something shows all six rows and no phone row`, async ({ page }) => {
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

  test('at 1024px the rail is back and Today stacks inside it (the grid now starts at 1024, was 1001)', async ({ page }) => {
    watch(page, 'a designer on the narrowest laptop')
    await open(page, { width: 1024, height: 900 })
    const b = {}
    for (const sel of ['.uh-today-clock', '.uh-meters', '.uh-dash-main > .uh-continue', '.uh-today']) b[sel] = await box(page, sel)
    expect(b['.uh-today'].left, 'Today is not in the rail beside the work').toBeGreaterThanOrEqual(b['.uh-dash-main > .uh-continue'].right)
    expect(b['.uh-meters'].top, 'the meters are not under the clock').toBeGreaterThanOrEqual(b['.uh-today-clock'].bottom - 1)
  })
})

test.describe('the starter\'s steps', () => {
  // The steps were a 32px text list; they are now four numbered tool plates (spec 5.3). What is kept: a
  // numbered sequence, plain text under each plate, nothing to click or focus (Start the walkthrough is the way in).
  for (const size of SIZES) {
    test(`at ${size.width}px are four numbered plates in order, not links`, async ({ page }) => {
      watch(page, 'a new account reading the walkthrough')
      await open(page, size, { projects: [] })
      const steps = await page.getByTestId('starter-card').getByRole('list', { name: 'The walkthrough' }).evaluate((ol) => ({
        tag: ol.tagName,
        interactive: ol.querySelectorAll('a, button, [tabindex]').length,
        rows: [...ol.querySelectorAll('li')].map((li) => {
          const label = li.querySelector('.uh-step-label')
          const cs = getComputedStyle(label)
          return { n: li.querySelector('.uh-step-n')?.textContent, underline: cs.textDecorationLine, size: cs.fontSize, plate: li.querySelector('.spt-art')?.getAttribute('data-art') }
        }),
      }))
      expect(steps.tag, 'the steps are a numbered sequence').toBe('OL')
      expect(steps.interactive, 'a step is something to click or focus').toBe(0)
      expect(steps.rows.map((r) => r.n)).toEqual(['1', '2', '3', '4'])
      expect(steps.rows.map((r) => r.plate)).toEqual(['palette', 'font-pair', 'type-scale', 'tint'])
      expect(steps.rows.map((r) => r.underline), 'a step looks like a link').toEqual(Array(4).fill('none'))
      expect(steps.rows.map((r) => r.size), 'a step label is not 14px').toEqual(Array(4).fill('14px'))
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

// ── The /tools language (spec 12: the assertions that are new with the restyle) ─────────────────────
//
// MUTATION: each of these fails on origin/main's /projects (the filled `--card` panel round the lead, rows
// with a `.uh-mini` strip and no hairline inset, `.uh-quick` tiles). Recorded in the commit message.
for (const size of SIZES) {
  test.describe(`the workspace in the /tools language at ${size.width}px`, () => {
    for (const [label, opts] of [['the lead', {}], ['the starter', { projects: [] }]]) {
      test(`${label} is a drawn plate with no framed panel around it`, async ({ page }) => {
        watch(page, `a designer looking at ${label} on a ${size.name}`)
        await open(page, size, opts)
        const found = await page.evaluate(() => {
          const lead = document.querySelector('.uh-dash-main > .uh-continue')
          const plate = lead.querySelector('.spt-art') || null
          // Every box from the plate up to the page's content column: none may be a frame of its own
          // (a border, a fill, a shadow or an outline), or the lead is a card inside a card.
          const framed = []
          for (let el = plate ? plate.parentElement : null; el && !el.classList.contains('uh-main'); el = el.parentElement) {
            const cs = getComputedStyle(el)
            const border = ['Top', 'Right', 'Bottom', 'Left'].some((side) => parseFloat(cs[`border${side}Width`]) > 0 && cs[`border${side}Style`] !== 'none')
            const fill = !/rgba\(0, 0, 0, 0\)|transparent/.test(cs.backgroundColor) || cs.backgroundImage !== 'none'
            const ring = cs.boxShadow !== 'none' || (parseFloat(cs.outlineWidth) > 0 && cs.outlineStyle !== 'none')
            if (border || fill || ring) framed.push(`${el.tagName.toLowerCase()}.${String(el.className).split(' ')[0]}`)
          }
          const p = plate && getComputedStyle(plate)
          return { plate: !!plate, framed, plateFrame: p && { outline: p.outlineStyle, radius: p.borderTopLeftRadius }, text: lead.getBoundingClientRect().height > (plate?.getBoundingClientRect().height || 0) }
        })
        expect(found.plate, 'no drawn plate in the lead: the measurement below would be empty').toBe(true)
        expect(found.framed, 'a framed panel round the lead plate').toEqual([])
        expect(found.plateFrame.outline, 'the plate is the one frame').not.toBe('none')
        expect(found.plateFrame.radius, 'the plate is the /tools plate (12px lead, 10px thumb)').toBe(label === 'the lead' ? '12px' : '10px')
      })
    }

    test('the hairlines between rows stay inside the content column, in Other projects and Start something', async ({ page }) => {
      watch(page, `a designer scanning the ruled rows on a ${size.name}`)
      await open(page, size)
      const out = await page.evaluate(() => {
        const main = document.querySelector('.uh-main')
        const mcs = getComputedStyle(main)
        const col = { left: main.getBoundingClientRect().left + parseFloat(mcs.paddingLeft), right: main.getBoundingClientRect().right - parseFloat(mcs.paddingRight) }
        const lines = []
        for (const row of document.querySelectorAll('.uh-rows .spt-row, .uh-tools .spt-row, .uh-tool--all')) {
          const r = row.getBoundingClientRect()
          if (!r.width) continue
          const host = row.classList.contains('uh-tool--all') ? row.parentElement : row
          const hr = host.getBoundingClientRect()
          const b = getComputedStyle(host, '::before')
          if (b.content === 'none' || b.content === 'normal') continue
          lines.push({ row: (row.getAttribute('data-tool') || row.getAttribute('data-project') || 'all'), left: hr.left + parseFloat(b.left), right: hr.right - parseFloat(b.right), width: b.borderTopWidth })
        }
        return { col, lines }
      })
      expect(out.lines.length, 'no ruled row drew a hairline: the sweep measured nothing').toBeGreaterThanOrEqual(8)
      for (const l of out.lines) {
        expect(l.width, `${l.row}: the rule is a 1px hairline`).toBe('1px')
        expect(l.left, `${l.row}: its hairline starts left of the column (${l.left} < ${out.col.left})`).toBeGreaterThanOrEqual(out.col.left - 0.5)
        expect(l.right, `${l.row}: its hairline runs past the column (${l.right} > ${out.col.right})`).toBeLessThanOrEqual(out.col.right + 0.5)
      }
    })

    test('a very long project name does not push the lead, the rows or the page sideways', async ({ page }) => {
      watch(page, `a designer with an unbroken project name on a ${size.name}`)
      const long = 'Extraordinarilylongprojectnamewithnospacesatalltotestthetruncation'
      await open(page, size, { projects: [{ ...complete(), name: long }, { ...half('p-half', long + 'Two', ago(26 * 60 * MINUTE)) }] })
      const m = await page.evaluate(() => {
        const de = document.documentElement
        return { overflow: de.scrollWidth - de.clientWidth, names: [...document.querySelectorAll('.uh-continue-name, .uh-row-name')].filter((el) => { const r = el.getBoundingClientRect(); return r.right > de.clientWidth + 1 || r.left < -1 }).map((el) => el.className + ' ' + Math.round(el.getBoundingClientRect().left) + '-' + Math.round(el.getBoundingClientRect().right) + ' of ' + de.clientWidth) }
      })
      await expect(page.locator('.uh-row-name').first()).toContainText('Extraordinarily')
      expect(m, 'the page scrolls sideways, or a project name is drawn past the viewport').toEqual({ overflow: 0, names: [] })
    })
  })
}
