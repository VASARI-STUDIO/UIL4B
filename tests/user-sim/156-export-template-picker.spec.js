// THE EXPORT TEMPLATE PICKER (export templates, slice 1).
//
// The picker renders only when a row has two or more LIVE templates. The design system
// book now has three (Specification, Monograph, Atlas); the kit and the guidelines
// (and the guidelines, since slice 3: Presentation, Poster, Grid) and the kit has one. So this spec does three jobs.
//
//   1. As shipped, the book row shows a three-tile picker for a Free and a Pro account,
//      choosing Monograph sends `template: 'monograph'`, a Free account sees the tiles
//      but is held at the Pro button, and the kit and guidelines rows show no picker.
//   2. With a second kit or guidelines template made live, the picker works for a person: arrow keys move
//      and choose (and wrap), Home and End jump, Tab enters on the chosen tile, the
//      choice is kept on the project and survives a reload, it fits at 390, and a
//      Free account choosing a Pro template still never reaches the document route.
//
// THE FIXTURE. For the kit and the guidelines, a second template is made live by rewriting
// the built panel chunk as it is served (the `live` flag of the named templates, in
// src/config/exportTemplates.js). The book row is NOT patched: it is live for real users.
// Nothing in src/ knows about the test. If the build ever stops matching, the
// rewrite finds nothing, `fixture.patched` stays short and the test says so by name,
// rather than passing against a picker that is not there.
//
// ── MUTATION ────────────────────────────────────────────────────────────────
// The guidelines tests were checked by the mutations listed in the lane report. The earlier ones:
// Each of these was applied to the source, built, and turned the named tests red:
//   - ExportPanel: the picker `onChange` no longer calls updateDesign -> the keys
//     (stored choice), click-and-reload, and both Free/Pro template tests;
//   - useRovingRadio: the wrap `(to + count) % count` becomes a clamp  -> the keys test;
//   - ExportTemplatePicker: tabIndex is 0 on every tile                -> the Tab test;
//   - the panel AND the picker show with one live template (`> 0`)     -> "no picker" x2;
//   - readExportTemplates trusts a stored id instead of isTemplate     -> the stored-id test.
import { test, expect } from './base.js'
import { go, watch, signIn } from './helpers.js'
import { chooseFormat, exportPanel, actionLabel, groupOfFormat, rowFor } from './export-rows.js'
import { buildDesignSystemBook } from '../../src/utils/designSystemBook.js'
import { buildBrandGuidelines } from '../../src/utils/brandGuidelines.js'

const BOARD = '/create/palette?c=1F4B8E,2E7BB8,3FA9A0'
const ROUTE = '**/api/ai?export=document'
const DESIGN = { palette: { base: '#1F4B8E', colors: ['#1F4B8E', '#3FA9A0'] } }

const NAMES = {
  studio: 'Studio', manual: 'Manual', showcase: 'Showcase',
  specification: 'Specification', monograph: 'Monograph', atlas: 'Atlas',
  presentation: 'Presentation', poster: 'Poster', grid: 'Grid',
}

/**
 * Make the named templates live in the panel the browser is given.
 * Returns `patched`, the ids actually changed, so a test can assert on the
 * fixture itself.
 */
async function makeLive(context, ids) {
  const patched = []
  await context.route(/\/assets\/ExportPanel-[^/]+\.js$/, async (route) => {
    const response = await route.fetch()
    let body = await response.text()
    for (const id of ids) {
      // A(`manual`,`Manual`,`Every token in a ruled table.`)  ->  ...,{live:!0})
      const call = new RegExp(`([\\w$]+\\(\`${id}\`,\`${NAMES[id]}\`,\`[^\`]*\`)\\)`)
      if (!call.test(body)) continue
      body = body.replace(call, '$1,{live:!0})')
      patched.push(id)
    }
    await route.fulfill({ response, body })
  })
  return { patched }
}

const KIT = ['manual', 'showcase']

async function openProject(page, plan = 'free', url = BOARD) {
  const account = await signIn(page, { plan })
  await go(page, url)
  await page.getByRole('button', { name: 'Export', exact: true }).first().click()
  await expect(exportPanel(page)).toBeVisible()
  return account
}

const group = (page) => exportPanel(page).getByRole('radiogroup', { name: 'Template' })
// Found by the start of its name: today the tile's name is its text content, which
// includes the description (see the accessible-name test below).
const tile = (page, name) => group(page).getByRole('radio', { name: new RegExp(`^${name}\\b`) })

/** Which tile is checked and which has focus, as the names a person would read. */
async function state(page) {
  return group(page).getByRole('radio').evaluateAll((tiles) => ({
    checked: tiles.filter((t) => t.getAttribute('aria-checked') === 'true').map((t) => t.querySelector('.exp-tpl-name').textContent),
    focused: tiles.filter((t) => t === document.activeElement).map((t) => t.querySelector('.exp-tpl-name').textContent),
    tabbable: tiles.filter((t) => t.tabIndex === 0).map((t) => t.querySelector('.exp-tpl-name').textContent),
  }))
}

const storedDesign = (page) => page.evaluate(() => JSON.parse(localStorage.getItem('vs-current-design') || '{}'))

/* ── as shipped ───────────────────────────────────────────────────────────── */

for (const plan of ['free', 'pro']) {
  test(`as shipped, the book row shows Specification, Monograph and Atlas, the guidelines row Presentation, Poster and Grid, and the kit row no picker (${plan})`, async ({ page }) => {
    watch(page, `a ${plan} account looking for a template choice`)
    await openProject(page, plan)
    await chooseFormat(page, 'kit')
    await expect(rowFor(exportPanel(page), groupOfFormat('kit').name), 'the kit row is chosen').toHaveAttribute('aria-checked', 'true')
    await expect(group(page), 'the kit row has one template, so there is nothing to choose').toHaveCount(0)
    await expect(exportPanel(page).locator('.exp-tpl')).toHaveCount(0)
    await chooseFormat(page, 'book')
    await expect(rowFor(exportPanel(page), groupOfFormat('book').name)).toHaveAttribute('aria-checked', 'true')
    await expect(group(page)).toHaveCount(1)
    await expect(group(page).getByRole('radio')).toHaveText([/Specification/, /Monograph/, /Atlas/])
    expect(await state(page), 'the default is chosen and is the only tab stop').toEqual({ checked: ['Specification'], focused: [], tabbable: ['Specification'] })

    await chooseFormat(page, 'guidelines')
    await expect(group(page)).toHaveCount(1)
    await expect(group(page).getByRole('radio')).toHaveText([/Presentation/, /Poster/, /Grid/])
    expect(await state(page), 'the default is chosen and is the only tab stop').toEqual({ checked: ['Presentation'], focused: [], tabbable: ['Presentation'] })
  })
}

test('Free sees the book tiles clear and the preview locked, and the button still says Unlock with Pro', async ({ page }) => {
  watch(page, 'a free account looking at the book templates')
  await openProject(page, 'free')
  await chooseFormat(page, 'book')
  await expect(group(page).getByRole('radio')).toHaveCount(3)
  await expect(exportPanel(page).locator('.exp-preview-lock'), 'the page strip is locked for Free').toBeVisible()
  await expect(exportPanel(page).getByRole('button', { name: /Unlock with Pro/i })).toBeVisible()
  // The tiles carry no per-tile lock: all three are Pro, so the row's own mark says it once.
  await expect(group(page).locator('.exp-tpl-tile .exp-preview-tag, .exp-tpl-tile [class*="pro-tag"]')).toHaveCount(0)
})

test('Pro sees no lock on the book row, and the button names the export', async ({ page }) => {
  watch(page, 'a Pro account looking at the book templates')
  await openProject(page, 'pro')
  await chooseFormat(page, 'book')
  await expect(group(page).getByRole('radio')).toHaveCount(3)
  await expect(exportPanel(page).locator('.exp-preview-lock')).toHaveCount(0)
  await expect(exportPanel(page).getByRole('button', { name: actionLabel('book'), exact: true })).toBeVisible()
})

/* ── with a second template live ──────────────────────────────────────────── */

test('the picker appears when a row has a second live template, and only on that row', async ({ page, context }) => {
  watch(page, 'a designer on a row with three templates')
  const fixture = await makeLive(context, KIT)
  await openProject(page)
  await chooseFormat(page, 'kit')

  await expect(group(page)).toHaveCount(1)
  expect(fixture.patched.sort(), 'the fixture could not make the templates live: the built panel has changed shape').toEqual([...KIT].sort())
  await expect(group(page).getByRole('radio')).toHaveText([/Studio/, /Manual/, /Showcase/])
  expect(await state(page)).toEqual({ checked: ['Studio'], focused: [], tabbable: ['Studio'] })

  // The guidelines row has its own, live for everyone and not patched.
  await chooseFormat(page, 'guidelines')
  await expect(group(page).getByRole('radio')).toHaveText([/Presentation/, /Poster/, /Grid/])
})

test('each tile is named by its template name alone and described by its description', async ({ page, context }) => {
  watch(page, 'a screen reader user on the template choice')
  await makeLive(context, KIT)
  await openProject(page)
  await chooseFormat(page, 'kit')
  await expect(tile(page, 'Studio')).toHaveAccessibleName('Studio', { timeout: 2000 })
  await expect(tile(page, 'Studio')).toHaveAccessibleDescription('A working page, components first.', { timeout: 2000 })
})

test('arrow keys move and choose, Home and End jump, and the ends wrap', async ({ page, context }) => {
  watch(page, 'a keyboard user choosing a kit template')
  await makeLive(context, KIT)
  await openProject(page)
  await chooseFormat(page, 'kit')
  await tile(page, 'Studio').focus()

  const steps = [
    ['ArrowRight', 'Manual'],
    ['ArrowDown', 'Showcase'],
    ['ArrowRight', 'Studio'], // wraps from the last to the first
    ['ArrowLeft', 'Showcase'], // and from the first to the last
    ['ArrowUp', 'Manual'],
    ['End', 'Showcase'],
    ['Home', 'Studio'],
  ]
  for (const [key, name] of steps) {
    await page.keyboard.press(key)
    expect(await state(page), `after ${key}`).toEqual({ checked: [name], focused: [name], tabbable: [name] })
  }
  // Choosing by key chose it: the working design now holds the last pick.
  await page.keyboard.press('End')
  await expect.poll(async () => (await storedDesign(page)).exportTemplates?.kit).toBe('showcase')
})

test('Tab enters on the chosen tile, not the first, and leaves the group in one press', async ({ page, context }) => {
  watch(page, 'a keyboard user tabbing into the template choice')
  await makeLive(context, KIT)
  await openProject(page)
  await chooseFormat(page, 'kit')

  await tile(page, 'Studio').focus()
  await page.keyboard.press('ArrowRight') // Manual is now the choice
  await exportPanel(page).getByRole('radio', { name: /^UI kit/ }).focus()
  await page.keyboard.press('Tab')
  expect(await state(page), 'Tab from the row list lands on the chosen tile').toEqual({ checked: ['Manual'], focused: ['Manual'], tabbable: ['Manual'] })

  await page.keyboard.press('Tab')
  expect((await state(page)).focused, 'one Tab leaves the group; the tiles are not each a stop').toEqual([])
  await page.keyboard.press('Shift+Tab')
  expect((await state(page)).focused, 'and Shift+Tab comes back to the chosen tile').toEqual(['Manual'])
})

test('a click chooses a tile, and the choice is kept on the project and survives a reload', async ({ page, context }) => {
  watch(page, 'a designer choosing a kit template on a saved project')
  await makeLive(context, KIT)
  const account = await signIn(page, { plan: 'free', projects: 1 })
  await go(page, '/projects/seed-1')
  await page.locator('.pnav-export').click()
  await expect(exportPanel(page)).toBeVisible()
  await expect(group(page)).toHaveCount(1)
  expect((await state(page)).checked, 'a project that never chose gets the default').toEqual(['Studio'])

  await tile(page, 'Showcase').click()
  expect((await state(page)).checked).toEqual(['Showcase'])
  await expect.poll(async () => (await storedDesign(page)).exportTemplates).toEqual({ kit: 'showcase' })

  // Keep it on the project (the page's own Save), then lose the working copy so only
  // the saved project can carry the choice back.
  await page.keyboard.press('Escape')
  await expect(exportPanel(page)).toBeHidden()
  await page.getByRole('button', { name: 'Save current' }).click()
  await expect.poll(() => page.evaluate((email) =>
    JSON.parse(localStorage.getItem('vs-projects'))[email].find((p) => p.id === 'seed-1').design.exportTemplates, account.email))
    .toEqual({ kit: 'showcase' })
  await page.evaluate(() => localStorage.removeItem('vs-current-design'))

  await page.reload()
  await go(page, '/projects/seed-1')
  await page.locator('.pnav-export').click()
  await expect(exportPanel(page)).toBeVisible()
  await expect(group(page)).toHaveCount(1)
  expect((await state(page)).checked, 'the saved project remembers its template').toEqual(['Showcase'])
})

test('a stored id that is not a live template is ignored: the default tile, and the default is what is sent', async ({ page, context }) => {
  watch(page, 'a Pro account opening a project saved by a newer copy of the app')
  await context.addInitScript(() => { window.print = () => {} })
  await makeLive(context, KIT)
  const asked = await watchDocumentRequests(page, () => ({ ok: true, format: 'book', template: 'specification', html: buildDesignSystemBook(DESIGN, { projectName: 'Stub' }) }))
  await signIn(page, { plan: 'pro' })
  // Written before the app starts, once. Neither `kit` nor `book` names a template that exists.
  await page.addInitScript(() => {
    if (!localStorage.getItem('vs-current-design')) {
      localStorage.setItem('vs-current-design', JSON.stringify({ palette: { base: '#1F4B8E', colors: ['#1F4B8E', '#3FA9A0'] }, exportTemplates: { kit: 'nonesuch', book: 'nonesuch' } }))
    }
  })
  await go(page, BOARD)
  await page.getByRole('button', { name: 'Export', exact: true }).first().click()
  await chooseFormat(page, 'kit')
  expect((await state(page)).checked, 'an unknown id falls back to the default tile').toEqual(['Studio'])

  await chooseFormat(page, 'book')
  await Promise.all([
    context.waitForEvent('page'),
    exportPanel(page).getByRole('button', { name: actionLabel('book'), exact: true }).click(),
  ])
  await expect.poll(() => asked.length).toBe(1)
  expect(asked[0].template, 'a stored id that is not a live template must not reach the server').toBe('specification')
})

for (const width of [390, 768]) {
  test(`at ${width} the tiles fit the panel: no sideways scroll and no name cut off`, async ({ page, context }) => {
    watch(page, `a designer choosing a template at ${width}`)
    await page.setViewportSize({ width, height: 844 })
    const fixture = await makeLive(context, KIT)
    await openProject(page)

    for (const id of ['kit', 'book', 'guidelines']) {
      await chooseFormat(page, id)
      await expect(group(page)).toHaveCount(1)
      const fit = await page.evaluate(() => {
        const panel = document.querySelector('[role="dialog"][aria-label], [role="dialog"]')
        const row = document.querySelector('.exp-tpl-row')
        const rowBox = row.getBoundingClientRect()
        const tiles = [...row.querySelectorAll('.exp-tpl-tile')]
        return {
          page: document.documentElement.scrollWidth - document.documentElement.clientWidth,
          panel: panel.scrollWidth - panel.clientWidth,
          row: row.scrollWidth - row.clientWidth,
          names: tiles.map((t) => {
            const n = t.querySelector('.exp-tpl-name')
            return { text: n.textContent, clipped: n.scrollWidth - n.clientWidth, width: Math.round(n.clientWidth) }
          }),
          outside: tiles.filter((t) => {
            const b = t.getBoundingClientRect()
            return b.left < rowBox.left - 0.5 || b.right > rowBox.right + 0.5 || b.right > innerWidth + 0.5
          }).map((t) => t.querySelector('.exp-tpl-name').textContent),
          desc: tiles.map((t) => getComputedStyle(t.querySelector('.exp-tpl-desc')).display),
          picked: getComputedStyle(document.querySelector('.exp-tpl-picked')).display,
          pickedText: document.querySelector('.exp-tpl-picked').textContent,
        }
      })
      const where = `${id} at ${width}: ${JSON.stringify(fit)}`
      expect(fit.page, `the page scrolls sideways, ${where}`).toBeLessThanOrEqual(0)
      expect(fit.panel, `the panel scrolls sideways, ${where}`).toBeLessThanOrEqual(0)
      expect(fit.row, `the tile row scrolls sideways, ${where}`).toBeLessThanOrEqual(0)
      expect(fit.outside, `a tile sits outside the row, ${where}`).toEqual([])
      for (const n of fit.names) expect(n.clipped, `"${n.text}" is truncated, ${where}`).toBeLessThanOrEqual(0)
      if (width === 390) {
        // The description moves under the row instead of being dropped.
        expect(fit.desc, where).toEqual(fit.names.map(() => 'none'))
        expect(fit.picked, where).toBe('block')
        expect(fit.pickedText.length, where).toBeGreaterThan(0)
      } else {
        expect(fit.desc.filter((d) => d === 'none'), `a description is hidden, ${where}`).toEqual([])
        expect(fit.picked, where).toBe('none')
      }
    }
    expect(fixture.patched.sort(), 'the fixture could not make the kit templates live').toEqual([...KIT].sort())
  })
}

test('the longest names are measured, not assumed: Specification and Presentation each fit a tile at 390', async ({ page }) => {
  watch(page, 'a designer on a phone')
  await page.setViewportSize({ width: 390, height: 844 })
  await openProject(page)
  await chooseFormat(page, 'book')
  await expect(tile(page, 'Specification')).toBeVisible()
  await chooseFormat(page, 'guidelines')
  await expect(tile(page, 'Presentation')).toBeVisible()
  const widths = await page.evaluate(() => [...document.querySelectorAll('.exp-tpl-name')].map((n) => ({ text: n.textContent, need: n.scrollWidth, have: n.clientWidth })))
  for (const w of widths) expect(w.need, `${w.text} needs ${w.need}px of ${w.have}px`).toBeLessThanOrEqual(w.have)
})

/* ── Free and a Pro template ──────────────────────────────────────────────── */

async function watchDocumentRequests(page, reply) {
  const asked = []
  await page.route(ROUTE, async (route) => {
    asked.push(route.request().postDataJSON())
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(reply()) })
  })
  return asked
}

test('a Free account that chooses the Monograph is sent to /plans and no document is requested', async ({ page }) => {
  watch(page, 'a free account choosing the Monograph book')
  const asked = await watchDocumentRequests(page, () => ({ ok: true, format: 'book', html: '<html></html>' }))
  await openProject(page, 'free')
  await chooseFormat(page, 'book')
  await expect(group(page)).toHaveCount(1)

  await tile(page, 'Monograph').click()
  expect((await state(page)).checked).toEqual(['Monograph'])
  await expect.poll(async () => (await storedDesign(page)).exportTemplates?.book).toBe('monograph')
  await exportPanel(page).getByRole('button', { name: /Unlock with Pro/i }).click()

  await expect(page).toHaveURL(/\/plans(\?|$)/)
  expect(asked, 'a Free account must not reach the document route, whichever template it chose').toHaveLength(0)
})

test('CONTROL: a Pro account that chooses the same template does send it to the server', async ({ page, context }) => {
  watch(page, 'a Pro account choosing the Monograph book')
  await context.addInitScript(() => { window.print = () => {} })
  const asked = await watchDocumentRequests(page, () => ({ ok: true, format: 'book', template: 'monograph', html: buildDesignSystemBook(DESIGN, { projectName: 'Stub' }) }))
  await openProject(page, 'pro')
  await chooseFormat(page, 'book')
  await tile(page, 'Monograph').click()

  const [doc] = await Promise.all([
    context.waitForEvent('page'),
    exportPanel(page).getByRole('button', { name: actionLabel('book'), exact: true }).click(),
  ])
  await expect(doc.locator('.cv-title')).toBeVisible()
  expect(asked).toHaveLength(1)
  expect(asked[0].format).toBe('book')
  expect(asked[0].template, 'the chosen template is what the panel asks for').toBe('monograph')
})

/* ── the brand guidelines row: Presentation, Poster, Grid ─────────────────── */

const strip = (page) => exportPanel(page).locator('.exp-preview-strip')

test('Free sees the guidelines tiles clear, the strip and button locked for Presentation, and no strip once Poster or Grid is chosen', async ({ page }) => {
  watch(page, 'a free account looking at the guidelines templates')
  await openProject(page, 'free')
  await chooseFormat(page, 'guidelines')
  await expect(group(page).getByRole('radio')).toHaveText([/Presentation/, /Poster/, /Grid/])
  await expect(strip(page), 'the default template shows the page strip').toBeVisible()
  await expect(exportPanel(page).locator('.exp-preview-lock'), 'and it is locked for Free').toBeVisible()
  await expect(exportPanel(page).getByRole('button', { name: /Unlock with Pro/i })).toBeVisible()

  for (const name of ['Poster', 'Grid']) {
    await tile(page, name).click()
    expect((await state(page)).checked).toEqual([name])
    await expect(strip(page), `the strip is drawn in the Presentation layout, so ${name} hides it`).toHaveCount(0)
    await expect(exportPanel(page).locator('.exp-preview-lock')).toHaveCount(0)
    await expect(exportPanel(page).getByRole('button', { name: /Unlock with Pro/i }), 'the button is still locked').toBeVisible()
  }
  await tile(page, 'Presentation').click()
  await expect(strip(page), 'choosing the default brings the strip back').toBeVisible()
  await expect(exportPanel(page).locator('.exp-preview-lock')).toBeVisible()
})

test('Pro sees no lock on the guidelines row, and the button names the export', async ({ page }) => {
  watch(page, 'a Pro account looking at the guidelines templates')
  await openProject(page, 'pro')
  await chooseFormat(page, 'guidelines')
  await expect(group(page).getByRole('radio')).toHaveCount(3)
  await expect(exportPanel(page).locator('.exp-preview-lock')).toHaveCount(0)
  await expect(exportPanel(page).getByRole('button', { name: actionLabel('guidelines'), exact: true })).toBeVisible()
})

test('arrow keys move through Presentation, Poster and Grid and wrap, and the choice is kept on the design', async ({ page }) => {
  watch(page, 'a keyboard user choosing a guidelines template')
  await openProject(page)
  await chooseFormat(page, 'guidelines')
  await tile(page, 'Presentation').focus()
  for (const [key, name] of [['ArrowRight', 'Poster'], ['ArrowRight', 'Grid'], ['ArrowRight', 'Presentation'], ['ArrowLeft', 'Grid'], ['Home', 'Presentation'], ['End', 'Grid']]) {
    await page.keyboard.press(key)
    expect(await state(page), `after ${key}`).toEqual({ checked: [name], focused: [name], tabbable: [name] })
  }
  await expect.poll(async () => (await storedDesign(page)).exportTemplates?.guidelines).toBe('grid')
})

test('a Free account that chooses Grid is sent to /plans and no document is requested', async ({ page }) => {
  watch(page, 'a free account choosing the Grid guidelines')
  const asked = await watchDocumentRequests(page, () => ({ ok: true, format: 'guidelines', html: '<html></html>' }))
  await openProject(page, 'free')
  await chooseFormat(page, 'guidelines')
  await tile(page, 'Grid').click()
  await exportPanel(page).getByRole('button', { name: /Unlock with Pro/i }).click()
  await expect(page).toHaveURL(/\/plans(\?|$)/)
  expect(asked, 'a Free account must not reach the document route, whichever template it chose').toHaveLength(0)
})

for (const [chosen, id, marker] of [['Grid', 'grid', '.mh-title'], ['Poster', 'poster', '.pn-top'], ['Presentation', 'presentation', '.cv-title']]) {
  test(`CONTROL: a Pro account that chooses ${chosen} sends template '${id}' to the server`, async ({ page, context }) => {
    watch(page, `a Pro account choosing the ${chosen} guidelines`)
    await context.addInitScript(() => { window.print = () => {} })
    const asked = await watchDocumentRequests(page, () => ({ ok: true, format: 'guidelines', template: id, html: buildBrandGuidelines(DESIGN, { projectName: 'Stub', template: id }) }))
    await openProject(page, 'pro')
    await chooseFormat(page, 'guidelines')
    await tile(page, chosen).click()
    const [doc] = await Promise.all([
      context.waitForEvent('page'),
      exportPanel(page).getByRole('button', { name: actionLabel('guidelines'), exact: true }).click(),
    ])
    await expect(doc.locator(marker).first()).toBeVisible()
    expect(asked).toHaveLength(1)
    expect(asked[0].format).toBe('guidelines')
    expect(asked[0].template, 'the chosen template is what the panel asks for').toBe(id)
  })
}
