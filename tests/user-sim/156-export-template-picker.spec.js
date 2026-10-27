// THE EXPORT TEMPLATE PICKER.
//
// The picker renders only when a row has two or more LIVE templates. Every row has three
// now: the kit (Studio, Manual, Showcase), the design system book (Specification,
// Monograph, Atlas) and the brand guidelines (Presentation, Poster, Grid). So this spec:
//
//   1. As shipped, every row shows a three-tile picker for a Free and a Pro account. The
//      book and the guidelines are Pro: choosing one sends its template to the server for
//      Pro, and a Free account is held at the Pro button and never reaches the document
//      route. The kit is free: choosing Manual or Showcase changes the file that downloads,
//      for a Free account (with the attribution) and for Pro (without it).
//   2. The picker works for a person: arrow keys move and choose (and wrap), Home and End
//      jump, Tab enters on the chosen tile, the choice is kept on the project and survives a
//      reload, and it fits at 390 and 768.
//
// Nothing here rewrites the build: every template is live for real users.
//
// ── MUTATION ────────────────────────────────────────────────────────────────
// Each of these was applied to the source, built, and turned the named tests red:
//   - ExportPanel: the picker `onChange` no longer calls updateDesign -> the keys
//     (stored choice), click-and-reload, and both Free/Pro template tests;
//   - useRovingRadio: the wrap `(to + count) % count` becomes a clamp  -> the keys test;
//   - ExportTemplatePicker: tabIndex is 0 on every tile                -> the Tab test;
//   - the panel AND the picker show with one live template (`> 0`)     -> the tile-count tests;
//   - readExportTemplates trusts a stored id instead of isTemplate     -> the stored-id test.
import { test, expect } from './base.js'
import { go, watch, signIn } from './helpers.js'
import { chooseFormat, exportPanel, actionLabel, groupOfFormat, rowFor } from './export-rows.js'
import { buildDesignSystemBook } from '../../src/utils/designSystemBook.js'
import { buildBrandGuidelines } from '../../src/utils/brandGuidelines.js'

const BOARD = '/create/palette?c=1F4B8E,2E7BB8,3FA9A0'
const ROUTE = '**/api/ai?export=document'
const DESIGN = { palette: { base: '#1F4B8E', colors: ['#1F4B8E', '#3FA9A0'] } }

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
  test(`as shipped, the kit row shows Studio, Manual and Showcase, the book row Specification, Monograph and Atlas, and the guidelines row Presentation, Poster and Grid (${plan})`, async ({ page }) => {
    watch(page, `a ${plan} account looking for a template choice`)
    await openProject(page, plan)
    await chooseFormat(page, 'kit')
    await expect(rowFor(exportPanel(page), groupOfFormat('kit').name), 'the kit row is chosen').toHaveAttribute('aria-checked', 'true')
    await expect(group(page), 'the kit row has three templates, so there is a choice').toHaveCount(1)
    await expect(group(page).getByRole('radio')).toHaveText([/Studio/, /Manual/, /Showcase/])
    expect(await state(page), 'the default is chosen and is the only tab stop').toEqual({ checked: ['Studio'], focused: [], tabbable: ['Studio'] })
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

test('the picker follows the row: one group at a time, with that row\'s own tiles', async ({ page }) => {
  watch(page, 'a designer moving between rows that each have three templates')
  await openProject(page)
  for (const [format, names] of [['kit', ['Studio', 'Manual', 'Showcase']], ['guidelines', ['Presentation', 'Poster', 'Grid']], ['book', ['Specification', 'Monograph', 'Atlas']], ['kit', ['Studio', 'Manual', 'Showcase']]]) {
    await chooseFormat(page, format)
    await expect(group(page), `one picker on the ${format} row`).toHaveCount(1)
    await expect(group(page).getByRole('radio')).toHaveText(names.map((n) => new RegExp(n)))
  }
  // A row with no template choice shows no picker: the CSS tokens have none.
  await chooseFormat(page, 'css')
  await expect(group(page)).toHaveCount(0)
})

test('each tile is named by its template name alone and described by its description', async ({ page }) => {
  watch(page, 'a screen reader user on the template choice')
  await openProject(page)
  await chooseFormat(page, 'kit')
  await expect(tile(page, 'Studio')).toHaveAccessibleName('Studio', { timeout: 2000 })
  await expect(tile(page, 'Studio')).toHaveAccessibleDescription('A working page, components first.', { timeout: 2000 })
})

test('arrow keys move and choose, Home and End jump, and the ends wrap', async ({ page }) => {
  watch(page, 'a keyboard user choosing a kit template')
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

test('Tab enters on the chosen tile, not the first, and leaves the group in one press', async ({ page }) => {
  watch(page, 'a keyboard user tabbing into the template choice')
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

test('a click chooses a tile, and the choice is kept on the project and survives a reload', async ({ page }) => {
  watch(page, 'a designer choosing a kit template on a saved project')
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
  test(`at ${width} the tiles fit the panel: no sideways scroll and no name cut off`, async ({ page }) => {
    watch(page, `a designer choosing a template at ${width}`)
    await page.setViewportSize({ width, height: 844 })
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

/* ── the kit is built in the browser: the tile changes the file ───────────── */

// What each layout says about itself in the file, and what only the other two say.
const KIT_LAYOUTS = [
  { tile: 'Studio', has: ['>Skip to UI kit<', 'class="monogram-panel"'] },
  { tile: 'Manual', has: ['>Skip to the manual<', '<table class="t colours">'] },
  { tile: 'Showcase', has: ['>Skip to the specimen<', 'class="cover-family"'] },
]

/** Answer the font requests from nothing, so the kit falls back and no live service is called. */
async function noFontService(page) {
  await page.route(/fonts\.googleapis\.com\/css2/, (route) => route.fulfill({ status: 404, body: '' }))
  await page.route(/cdn\.jsdelivr\.net\/gh\/google\/fonts/, (route) => route.fulfill({ status: 404, body: '' }))
}

for (const plan of ['free', 'pro']) {
  for (const { tile: chosen, has } of KIT_LAYOUTS) {
    test(`the kit export follows the tile: ${chosen} gives the ${chosen} document (${plan})`, async ({ page }) => {
      watch(page, `a ${plan} account exporting the ${chosen} kit`)
      await noFontService(page)
      await openProject(page, plan)
      await chooseFormat(page, 'kit')
      await tile(page, chosen).click()
      expect((await state(page)).checked).toEqual([chosen])

      const cta = exportPanel(page).getByRole('button', { name: actionLabel('kit'), exact: true })
      await expect(cta).toBeEnabled()
      const [download] = await Promise.all([page.waitForEvent('download', { timeout: 30000 }), cta.click()])
      const chunks = []
      for await (const chunk of await download.createReadStream()) chunks.push(chunk)
      const body = Buffer.concat(chunks).toString('utf8')

      expect(body.length, 'a real, self-contained document').toBeGreaterThan(60000)
      for (const marker of has) expect(body, `the ${chosen} document carries ${marker}`).toContain(marker)
      for (const other of KIT_LAYOUTS.filter((l) => l.tile !== chosen)) {
        for (const marker of other.has) expect(body, `the ${chosen} document carries the ${other.tile} marker ${marker}`).not.toContain(marker)
      }
      // The tier still decides the attribution, whichever layout is chosen.
      if (plan === 'free') {
        expect(body).toContain('class="section-watermark"')
        expect(body).toContain('content:"Made with UIL4B / Free UI kit"')
      } else {
        expect(body).not.toContain('class="section-watermark"')
        expect(body).not.toContain('Made with UIL4B')
      }
    })
  }
}

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
