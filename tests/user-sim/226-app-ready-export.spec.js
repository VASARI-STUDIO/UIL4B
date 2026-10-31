// APP-READY EXPORT: the export dialog's fourth type, one Pro category ("App-ready
// bundle", format id app-bundle) that downloads <slug>-app-ready.zip, built in the
// browser by src/utils/appBundle.js.
//
// What a person does here: open Export, pick App-ready, and either get the zip (Pro)
// or the Pro gate (free or signed out). The zip is read back with jszip and its
// contents are checked against hand-written expectations, not against the builder.
//
// Everything is found by role and name; the popup's own pieces use the same hooks as
// 190-export-v3 (.xd, .xd-primary, .xd-status). The folder tree in the preview is the
// .xfp box with data-kind="bundle".
//
// MUTATIONS (each break must fail the test named after it):
//   - Change the root folder in appBundle.js (UIL4B- to anything else): "the zip root" fails.
//   - Drop the dark rule from buildTokensCss: "the CSS has a .dark block" fails.
//   - Write the dark Figma file from the light tokens: "light and dark differ" fails.
//   - Give the apps category pro:false: every free-account test fails.
//   - Skip the Pro check for app-bundle in useExportRunner.run: "no download" fails.
//   - Remove 'apps' from EXPORT_TYPES: the keyboard test fails at the App-ready radio.
//
// Screenshots: set APP_READY_CAPTURES to a folder and the preview tests save viewport
// shots there; with it unset they save nothing.
import fs from 'node:fs'
import path from 'node:path'
import JSZip from 'jszip'
import { test, expect } from './base.js'
import { go, watch, signIn } from './helpers.js'
import { exportPanel, typeRadio, primaryButton, dockStatus, dockError } from './export-rows.js'

const PRIMARY = '#1F4B8E'
const WORKED_BOARD = `/create/palette?c=${PRIMARY.slice(1)},2E7BB8,3FA9A0`
const SLUG = 'untitled'
const ZIP_NAME = `${SLUG}-app-ready.zip`
const CAPTURES = process.env.APP_READY_CAPTURES || ''

const SIZES = [
  { label: '1440', viewport: { width: 1440, height: 900 }, touch: false },
  { label: '390 touch', viewport: { width: 390, height: 844 }, touch: true },
]

/** The popup, once it is visible and its entrance has finished moving. */
async function settled(page) {
  const panel = exportPanel(page)
  await expect(panel).toBeVisible()
  await panel.evaluate((el) => Promise.all(el.getAnimations({ subtree: true }).map((a) => a.finished)))
  return panel
}

/** Open from the app header's Export button. */
async function openFromHeader(page) {
  await page.locator('.pnav-export').click()
  return settled(page)
}

/** Open the popup and choose App-ready. */
async function openAppReady(page) {
  const panel = await openFromHeader(page)
  await typeRadio(panel, 'App-ready').click()
  await expect(typeRadio(panel, 'App-ready')).toHaveAttribute('aria-checked', 'true')
  return panel
}

/** Today as the page prints it (YYYY-MM-DD, local time). */
const pageToday = (page) => page.evaluate(() => {
  const d = new Date()
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
})

/** Press a button (or a key) and read the zip it downloads: { name, zip, paths }. */
async function takeZip(page, act) {
  const [download] = await Promise.all([page.waitForEvent('download'), act()])
  const bytes = fs.readFileSync(await download.path())
  const zip = await JSZip.loadAsync(bytes)
  return { name: download.suggestedFilename(), bytes, zip, paths: Object.keys(zip.files).filter((p) => !zip.files[p].dir) }
}

/** Every leaf (an object holding $value) of a DTCG document, as a sorted list of dotted paths. */
function tokenPaths(node, trail = []) {
  if (node === null || typeof node !== 'object') return []
  if (Object.hasOwn(node, '$value')) return [trail.join('.')]
  return Object.entries(node)
    .filter(([key]) => !key.startsWith('$'))
    .flatMap(([key, child]) => tokenPaths(child, [...trail, key]))
    .sort()
}

/** Check the zip against what the board and the feature promise. */
async function expectBundle({ name, zip, paths }, { before, after }) {
  expect(name).toBe(ZIP_NAME)

  const roots = [...new Set(paths.map((p) => p.split('/')[0]))]
  expect(roots, 'the zip has one root folder').toHaveLength(1)
  const root = roots[0]
  expect(root, 'the zip root is UIL4B-<slug>-<date>').toMatch(new RegExp(`^UIL4B-${SLUG}-\\d{4}-\\d{2}-\\d{2}$`))
  expect([before, after], 'the root carries today in the browser time zone').toContain(root.slice(`UIL4B-${SLUG}-`.length))

  const expected = [
    '00 Start here/README.md',
    '01 Figma/1-primitives.tokens.json',
    '01 Figma/2-semantic.light.tokens.json',
    '01 Figma/2-semantic.dark.tokens.json',
    `02 Adobe/${SLUG}-colours.ase`,
    `02 Adobe/${SLUG}-colours.aco`,
    `03 Other design apps/Affinity/${SLUG}-colours.ase`,
    `03 Other design apps/Procreate/${SLUG}-colours.ase`,
    `04 Code/css/${SLUG}.tokens.css`,
    `04 Code/tokens/${SLUG}.tokens.json`,
  ]
  for (const file of expected) expect(paths, `${file} is in the zip`).toContain(`${root}/${file}`)
  expect(paths.filter((p) => p.includes('01 Figma/') && p.endsWith('.tokens.json')), 'three Figma token files').toHaveLength(3)

  const text = (file) => zip.file(`${root}/${file}`).async('string')
  const bytesOf = (file) => zip.file(`${root}/${file}`).async('uint8array')

  // Figma: the light and dark files describe the same tokens, with different values.
  const light = JSON.parse(await text('01 Figma/2-semantic.light.tokens.json'))
  const dark = JSON.parse(await text('01 Figma/2-semantic.dark.tokens.json'))
  const lightKeys = tokenPaths(light)
  const darkKeys = tokenPaths(dark)
  expect(lightKeys.length, 'the light file holds tokens').toBeGreaterThan(5)
  expect(darkKeys, 'light and dark have identical key sets').toEqual(lightKeys)
  expect(JSON.stringify(dark), 'light and dark differ in value').not.toBe(JSON.stringify(light))

  // Adobe, Affinity and Procreate: an ASE file starts with "ASEF", and all three are one file.
  const ase = await bytesOf(`02 Adobe/${SLUG}-colours.ase`)
  expect(Buffer.from(ase.subarray(0, 4)).toString('latin1'), 'the .ase magic').toBe('ASEF')
  expect(ase.length, 'the .ase holds swatches').toBeGreaterThan(100)
  for (const other of [`03 Other design apps/Affinity/${SLUG}-colours.ase`, `03 Other design apps/Procreate/${SLUG}-colours.ase`]) {
    const copy = await bytesOf(other)
    expect(Buffer.from(copy.subarray(0, 4)).toString('latin1'), `${other} magic`).toBe('ASEF')
    expect(Buffer.from(copy).equals(Buffer.from(ase)), `${other} matches the Adobe .ase`).toBe(true)
  }
  expect((await bytesOf(`02 Adobe/${SLUG}-colours.aco`)).length, 'the .aco holds swatches').toBeGreaterThan(50)

  // Code: a stylesheet with a dark block, and tokens holding the board's primary.
  const css = await text(`04 Code/css/${SLUG}.tokens.css`)
  expect(css, 'the CSS has a .dark block with colours in it').toMatch(/\.dark\b[^{]*\{[^}]*--color-[a-z0-9-]+:\s*#[0-9a-f]{6}/i)
  expect(css, 'the CSS holds the primary').toContain(`--color-primary: ${PRIMARY.toLowerCase()};`)
  const tokens = JSON.parse(await text(`04 Code/tokens/${SLUG}.tokens.json`))
  expect(tokens.color.primary.$root.$value.hex, 'the JSON holds the primary').toBe(PRIMARY.toLowerCase())

  // README: says what is in the folders and lists the board's primary hex.
  const readme = await text('00 Start here/README.md')
  expect(readme, 'the README names each app folder').toMatch(/01 Figma[\s\S]*02 Adobe[\s\S]*03 Other design apps[\s\S]*04 Code/)
  expect(readme, `the README lists the primary ${PRIMARY}`).toMatch(new RegExp(`\\|\\s*Brand\\s*\\|\\s*${PRIMARY}\\s*\\|`, 'i'))
  expect(readme).toContain(root)
}

for (const size of SIZES) {
  test.describe(`a Pro account at ${size.label}`, () => {
    test.use({ viewport: size.viewport, hasTouch: size.touch, isMobile: size.touch })

    test('chooses App-ready and exports a zip with a folder per app', async ({ page }) => {
      watch(page, `a Pro subscriber exporting the app-ready bundle at ${size.label}`)
      await signIn(page, { plan: 'pro' })
      await go(page, WORKED_BOARD)
      const panel = await openAppReady(page)
      await expect(primaryButton(panel)).toHaveText('Export app-ready bundle')
      await expect(primaryButton(panel)).toBeEnabled()
      await expect(dockStatus(panel)).toContainText('Included in Pro')

      const before = await pageToday(page)
      const file = await takeZip(page, () => primaryButton(panel).click())
      const after = await pageToday(page)
      await expectBundle(file, { before, after })

      await expect(panel, 'the popup stays open after the export').toBeVisible()
      await expect(dockStatus(panel)).toHaveText(`Downloaded ${ZIP_NAME}.`)
      await expect(dockError(panel)).toHaveCount(0)
      await expect(primaryButton(panel)).toHaveText('Export again')
    })
  })
}

test.describe('a free signed-in account', () => {
  const EXPECTED_TREE = [
    '00 Start here/',
    '  README.md',
    '01 Figma/',
    '  1-primitives.tokens.json',
    '  2-semantic.light.tokens.json',
    '  2-semantic.dark.tokens.json',
    '02 Adobe/',
    `  ${SLUG}-colours.ase`,
    `  ${SLUG}-colours.aco`,
    '03 Other design apps/',
    `  Affinity/${SLUG}-colours.ase`,
    `  Procreate/${SLUG}-colours.ase`,
    '04 Code/',
    `  css/${SLUG}.tokens.css`,
    `  tokens/${SLUG}.tokens.json`,
    '',
    'How to import.md in each app folder',
  ].join('\n')

  for (const size of SIZES) {
    test.describe(`at ${size.label}`, () => {
      test.use({ viewport: size.viewport, hasTouch: size.touch, isMobile: size.touch })

      test('App-ready shows the Pro gate, its primary leads to /plans, and no file downloads', async ({ page }) => {
        watch(page, `a signed-in free account on App-ready at ${size.label}`)
        const downloads = []
        page.on('download', (d) => downloads.push(d.suggestedFilename()))
        await signIn(page, { plan: 'free' })
        await go(page, WORKED_BOARD)
        await page.evaluate(() => {
          window.__dl = 0
          const real = HTMLAnchorElement.prototype.click
          HTMLAnchorElement.prototype.click = function patched() {
            if (this.hasAttribute('download')) window.__dl += 1
            return real.apply(this, arguments)
          }
        })
        const panel = await openAppReady(page)
        await expect(primaryButton(panel)).toHaveText('Unlock with Pro')
        await expect(dockStatus(panel)).toContainText('Pro unlocks this file')

        await primaryButton(panel).click()
        await expect(page).toHaveURL(/\/plans(\?|$)/)
        const gates = await page.evaluate(() => (window.vaq || []).filter((q) => q[0] === 'event' && q[1].name === 'upgrade_gate_shown').map((q) => q[1].data))
        expect(gates, 'the gate is reported under its own id').toContainEqual({ gate: 'app-ready-bundle-export' })
        expect(await page.evaluate(() => window.__dl || 0), 'no download link was clicked').toBe(0)
        expect(downloads, 'the browser received no download').toEqual([])
      })

      test('the preview draws the folder tree inside the box, with nothing cut off or sideways', async ({ page }) => {
        watch(page, `a free account reading the App-ready preview at ${size.label}`)
        await signIn(page, { plan: 'free' })
        await go(page, WORKED_BOARD)
        const panel = await openAppReady(page)
        const preview = panel.locator('.xfp[data-kind="bundle"]')
        await expect(preview).toBeVisible()
        await expect(preview.locator('.xfp-box')).toHaveAttribute('data-state', 'ready')
        await expect(preview.locator('.xfp-file')).toHaveText(ZIP_NAME)
        await expect(preview.locator('.xfp-cap')).toHaveText('Inside')
        const tree = preview.locator('.xfp-code code')
        await expect(tree, 'the folder tree, line for line').toHaveText(EXPECTED_TREE)
        await expect(tree).toContainText('01 Figma/')
        await expect(tree).toContainText('02 Adobe/')

        const fit = await page.evaluate(() => {
          const card = document.querySelector('.xd-card')
          const scroll = document.querySelector('.xd-scroll')
          const box = document.querySelector('.xfp[data-kind="bundle"] .xfp-box').getBoundingClientRect()
          const pre = document.querySelector('.xfp[data-kind="bundle"] .xfp-code')
          const boxEl = document.querySelector('.xfp[data-kind="bundle"] .xfp-box')
          const cardBox = card.getBoundingClientRect()
          return {
            page: document.documentElement.scrollWidth - window.innerWidth,
            card: card.scrollWidth - card.clientWidth,
            column: scroll.scrollWidth - scroll.clientWidth,
            box: boxEl.scrollWidth - boxEl.clientWidth,
            preAcross: pre.scrollWidth - pre.clientWidth,
            boxLeft: box.left - cardBox.left,
            boxRight: cardBox.right - box.right,
          }
        })
        expect(fit.page, 'the page scrolls sideways').toBeLessThanOrEqual(0)
        expect(fit.card, 'the dialog scrolls sideways').toBeLessThanOrEqual(0)
        expect(fit.column, 'the column scrolls sideways').toBeLessThanOrEqual(0)
        expect(fit.box, 'the preview box overflows').toBeLessThanOrEqual(0)
        expect(fit.preAcross, 'a tree line is cut off at the side').toBeLessThanOrEqual(0)
        expect(fit.boxLeft, 'the box starts inside the dialog').toBeGreaterThanOrEqual(0)
        expect(fit.boxRight, 'the box ends inside the dialog').toBeGreaterThanOrEqual(0)
      })

      // KNOWN FAULT, marked test.fail(): the tree is 17 lines but the box (--xfp-h in
      // export-preview.css) is 300px at 1440 and 220px at 390, so the last lines are
      // faded out or cut off, including the closing "How to import.md" line. When the
      // box fits the tree this test passes, test.fail() turns that into a red run, and
      // the marker should come off.
      test('the whole tree is visible, down to the last line', async ({ page }) => {
        test.fail(true, 'the preview box is shorter than the 17-line tree')
        watch(page, `a free account reading the whole App-ready tree at ${size.label}`)
        await signIn(page, { plan: 'free' })
        await go(page, WORKED_BOARD)
        const panel = await openAppReady(page)
        const preview = panel.locator('.xfp[data-kind="bundle"]')
        await expect(preview.locator('.xfp-box')).toHaveAttribute('data-state', 'ready')
        const clipped = await preview.locator('.xfp-code').evaluate((pre) => pre.scrollHeight - pre.clientHeight)
        expect(clipped, 'pixels of the tree below the box').toBeLessThanOrEqual(0)
      })
    })
  }
})

test.describe('signed out', () => {
  test('App-ready is the same as free: the Pro gate, then /plans, no account dialog, no file', async ({ page }) => {
    watch(page, 'a visitor on App-ready')
    const downloads = []
    page.on('download', (d) => downloads.push(d.suggestedFilename()))
    await go(page, WORKED_BOARD)
    const panel = await openAppReady(page)
    await expect(primaryButton(panel)).toHaveText('Unlock with Pro')
    await expect(panel.locator('.xfp[data-kind="bundle"] .xfp-box')).toHaveAttribute('data-state', 'ready')
    await primaryButton(panel).click()
    await expect(page).toHaveURL(/\/plans(\?|$)/)
    await expect(page.locator('#ui-login-title'), 'a Pro file sends a visitor to /plans, not to the sign-up dialog').toHaveCount(0)
    const gates = await page.evaluate(() => (window.vaq || []).filter((q) => q[0] === 'event' && q[1].name === 'upgrade_gate_shown').map((q) => q[1].data))
    expect(gates).toContainEqual({ gate: 'app-ready-bundle-export' })
    expect(downloads, 'the browser received no download').toEqual([])
  })
})

test.describe('with the keyboard', () => {
  test('arrow keys reach App-ready, Tab reaches the primary, Enter exports and focus comes back to the opener', async ({ page }) => {
    watch(page, 'a keyboard user exporting the app-ready bundle')
    await signIn(page, { plan: 'pro' })
    await go(page, WORKED_BOARD)
    const opener = page.locator('.pnav-export')
    await opener.focus()
    await page.keyboard.press('Enter')
    const panel = await settled(page)
    await expect(panel.getByRole('heading', { level: 2 }), 'focus starts on the title').toBeFocused()

    await typeRadio(panel, 'Brand book').focus()
    for (const next of ['UI kit', 'Code', 'App-ready']) {
      await page.keyboard.press('ArrowDown')
      await expect(typeRadio(panel, next)).toBeFocused()
      await expect(typeRadio(panel, next)).toHaveAttribute('aria-checked', 'true')
    }
    await expect(primaryButton(panel)).toHaveText('Export app-ready bundle')
    await expect(panel.locator('.xfp[data-kind="bundle"] .xfp-box')).toHaveAttribute('data-state', 'ready')

    // Tab from the rail reaches the primary button without a mouse.
    let reached = false
    for (let i = 0; i < 12 && !reached; i += 1) {
      await page.keyboard.press('Tab')
      reached = await primaryButton(panel).evaluate((el) => el === document.activeElement)
    }
    expect(reached, 'Tab reaches the primary button from the type rail').toBe(true)

    const before = await pageToday(page)
    const file = await takeZip(page, () => page.keyboard.press('Enter'))
    const after = await pageToday(page)
    await expectBundle(file, { before, after })

    // Once the export is over the dialog hands focus back to its button.
    await expect(dockStatus(panel)).toHaveText(`Downloaded ${ZIP_NAME}.`)
    await expect(primaryButton(panel)).toBeFocused()
    expect(await page.evaluate(() => {
      const s = getComputedStyle(document.activeElement)
      return parseFloat(s.outlineWidth) > 0 || s.boxShadow !== 'none'
    }), 'the focused primary has a visible ring').toBe(true)

    await page.keyboard.press('Escape')
    await expect(exportPanel(page)).toBeHidden()
    await expect(opener, 'focus returns to the Export button').toBeFocused()
  })
})

/**
 * The WCAG contrast of an element's text on what is behind it. The colours are read
 * as the page paints them: each CSS colour is drawn to a canvas pixel (so oklch,
 * color-mix and rgb all arrive as sRGB), and the background is the first opaque
 * layer found walking up from the element, with translucent layers composited.
 */
const contrastOf = (locator) => locator.evaluate((el) => {
  const toRgba = (css) => {
    const c = document.createElement('canvas')
    c.width = 1
    c.height = 1
    const x = c.getContext('2d', { willReadFrequently: true })
    x.clearRect(0, 0, 1, 1)
    x.fillStyle = css
    x.fillRect(0, 0, 1, 1)
    const d = x.getImageData(0, 0, 1, 1).data
    return [d[0], d[1], d[2], d[3] / 255]
  }
  const over = (top, under) => top.slice(0, 3).map((v, i) => v * top[3] + under[i] * (1 - top[3]))
  const layers = []
  for (let n = el; n; n = n.parentElement) {
    const bg = toRgba(getComputedStyle(n).backgroundColor)
    if (bg[3] > 0) layers.push(bg)
    if (bg[3] === 1) break
  }
  let ground = [255, 255, 255]
  for (const layer of layers.reverse()) ground = over(layer, ground)
  const text = toRgba(getComputedStyle(el).color)
  const fg = over(text, ground)
  const lum = (rgb) => {
    const [r, g, b] = rgb.map((v) => {
      const s = v / 255
      return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
    })
    return 0.2126 * r + 0.7152 * g + 0.0722 * b
  }
  const [hi, lo] = [lum(fg), lum(ground)].sort((a, b) => b - a)
  return { ratio: (hi + 0.05) / (lo + 0.05), fg: fg.map(Math.round), ground: ground.map(Math.round) }
})

/** Wait for the preview's fade-in to finish, so a measure or a shot sees the final picture. */
async function previewSettled(panel) {
  const preview = panel.locator('.xfp[data-kind="bundle"]')
  await expect(preview.locator('.xfp-box')).toHaveAttribute('data-state', 'ready')
  await expect(preview.locator('.xfp-code')).toBeVisible()
  await preview.evaluate((el) => Promise.all(el.getAnimations({ subtree: true }).map((a) => a.finished)))
  return preview
}

async function inTheme(browser, { width, height, theme, touch }) {
  const context = await browser.newContext({
    viewport: { width, height },
    colorScheme: theme,
    hasTouch: touch,
    isMobile: touch,
  })
  await context.addInitScript((t) => { try { localStorage.setItem('vs-t', t) } catch { /* private mode */ } }, theme)
  return { context, page: await context.newPage() }
}

// The preview text must read in both themes; the label over the box (file name and
// "Inside") sits on the dialog, the tree sits on the box. A shot of each asked-for
// size and theme goes to APP_READY_CAPTURES when it is set.
test.describe('the preview reads in both themes', () => {
  const CASES = [
    { width: 390, height: 844, theme: 'light', touch: true, shot: '390-light' },
    { width: 390, height: 844, theme: 'dark', touch: true, shot: '390-dark' },
    { width: 1440, height: 900, theme: 'light', touch: false, shot: '1440-light' },
    { width: 1440, height: 900, theme: 'dark', touch: false, shot: '' },
  ]
  for (const c of CASES) {
    test(`${c.width}px ${c.theme}: tree, file name and caption are at least 4.5:1`, async ({ browser }) => {
      const { context, page } = await inTheme(browser, c)
      try {
        watch(page, `a free account reading the App-ready preview at ${c.width}px in ${c.theme}`)
        await signIn(page, { plan: 'free' })
        await go(page, WORKED_BOARD)
        await expect(page.locator('html')).toHaveAttribute('data-theme', c.theme)
        const panel = await openAppReady(page)
        const preview = await previewSettled(panel)

        for (const [what, selector] of [['the tree', '.xfp-code'], ['the file name', '.xfp-file'], ['the caption', '.xfp-cap']]) {
          const { ratio, fg, ground } = await contrastOf(preview.locator(selector))
          expect(ratio, `${what} in ${c.theme}: rgb(${fg}) on rgb(${ground}) is ${ratio.toFixed(2)}:1`).toBeGreaterThanOrEqual(4.5)
        }

        if (c.shot && CAPTURES) {
          fs.mkdirSync(CAPTURES, { recursive: true })
          // The viewport only: a full-page shot in a touch context is not the phone's view.
          await page.screenshot({ path: path.join(CAPTURES, `app-ready-preview-${c.shot}.png`) })
        }
      } finally {
        await context.close()
      }
    })
  }
})
