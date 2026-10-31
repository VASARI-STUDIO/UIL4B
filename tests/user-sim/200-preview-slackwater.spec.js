// "Slack Water" (the Editorial hero) in the Palette Builder's "Preview on a UI" dialog is a
// softly interactive article page: a ferry photograph, a drawn map with a time slider, a
// Subscribe sheet and a nav that swaps the panel under the story. 153 holds how every example
// renders, 50 holds its ink and 81 that it paints; this holds what a person DOES with it.
//
//   1. the Subscribe sheet: open, Cancel, the email error, success; the State menu follows
//   2. Escape closes the sheet and not the dialog
//   3. the nav swaps the panel under the story (Issues, Ferries, Tides)
//   4. the ferry slider moves the time readout (7:12 to 7:42) and the ferry on the map
//   5. Save toggles
//   6. the compare view (two palettes side by side) is a still picture: no controls
//   7. the photograph: 1440 loads the wide picture and never the portrait one; 390 the reverse
//   8. every text node clears 4.5:1 on the ground it is painted on, in light and dark and in
//      each of the three states, for the default palette and five stress palettes
//   9. on a phone the sheet opens, fits the screen, and closes
//  10. what the preview costs over the network, against the spec's budget
//
// Nothing is mocked: the dialog is opened the way a person opens it, signed in as Pro.
//
// To make each go red (undo it after):
//   1  in SlackWater.jsx Sheet, make Cancel's onClick a no-op; or onSubscribe always ask for 'article'
//   1b in SlackWater.jsx Sheet submit, always setDone(true) (the error never shows)
//   1c in SlackWater.jsx Sheet submit, fetch('/subscribe') before setDone(true) (success is local)
//   2  see the note on the test itself: the sheet must be an Escape layer
//   3  in SlackWater.jsx Masthead, make the nav's onClick `setNav('Issues')`
//   4  in SlackWater.jsx Crossing, drop `setP` from the range's onChange; or CrossingMap's setPt effect
//   5  in SlackWater.jsx Lede, make the Save onClick `setSaved(false)`
//   6  in SlackWater.jsx, drop the `!roles.pair &&` from `isLive` (the compare panes go live)
//   7  in SlackWater.jsx Photo, drop `narrow ?` (always the wide picture) or invert it
//   8  in SlackWater.css set .sw-by to `color:var(--pv-canvas)`; or .sw-err to a pale tint
//   9  in SlackWater.css, give .sw-sheet a fixed `width:480px` (the phone sheet runs off the screen)
//  10  in SlackWater.jsx Photo, point it at an asset with a 1600px width, or load the portrait as well
import { test, expect } from './base.js'
import { go, signIn, watch } from './helpers.js'
import { clickPaletteAction, pickPreviewState } from './palette-helpers.js'

test.use({ viewport: { width: 1440, height: 900 } })

const SCENE = 'Editorial hero'
const STATES = ['Article', 'Subscribe sheet', 'Subscribe, email error']

// The default palette (the mid one 50 and 153 use) and the five stress palettes of the spec:
// near-white, near-black, neon, two near-identical slots, and a pastel set.
const MID = ['#20838d', '#2994c7', '#5b89d7', '#8a9fea', '#c5c1f6']
const STRESS = {
  'near-white': ['#f3e9d2', '#f7dcd0', '#e4efe0', '#dfe9f5', '#f2e4f0'],
  'near-black': ['#0d1b2a', '#1b263b', '#2b3a55', '#3a2e5a', '#16100f'],
  neon: ['#39ff14', '#ff2bd6', '#00f0ff', '#fff200', '#ff3131'],
  'near-identical': ['#2a6f97', '#2a6f98', '#2a6f97', '#2b6f97', '#2a7097'],
  pastel: ['#ffd6e0', '#d6f0ff', '#e0ffd6', '#fff3c4', '#e8d6ff'],
}

async function seed(page, colors) {
  await page.addInitScript((cols) => {
    const raw = localStorage.getItem('vs-current-design')
    const design = raw ? JSON.parse(raw) : {}
    design.palette = {
      ...(design.palette || {}),
      base: cols[0], harmony: 'auto', extraColors: [], activeIdx: 0,
      colors: cols, baseColors: cols,
      globalAdjust: { h: 0, s: 0, b: 0, temp: 0 }, locked: [],
    }
    localStorage.setItem('vs-current-design', JSON.stringify(design))
  }, colors)
}

/** Open the preview dialog the way a person does; it opens on Slack Water. `seen` collects every request. */
async function openSlack(page, { colors = MID, theme, seen } = {}) {
  if (seen) page.on('request', (r) => seen.push({ url: r.url(), method: r.method(), post: r.postData() || '' }))
  await seed(page, colors)
  if (theme) await page.addInitScript((t) => localStorage.setItem('vs-t', t), theme)
  await signIn(page, { plan: 'pro' })
  await go(page, '/create/palette')
  await clickPaletteAction(page, 'Preview')
  const dialog = page.getByRole('dialog', { name: 'Palette preview' })
  await expect(dialog).toBeVisible()
  await expect(dialog.locator(`.pvs[data-preview-scene="${SCENE}"] .sw`)).toBeVisible()
  return dialog
}

const scene = (dialog) => dialog.locator(`.pvs[data-preview-scene="${SCENE}"]`)
const trigger = (dialog) => dialog.getByRole('button', { name: /^State\b/ })
const sheet = (dialog) => scene(dialog).locator('.sw-sheet')
/** The state the scene is showing, read off the scene itself and not off the menu. */
const shown = (dialog) => scene(dialog).locator('.sw').getAttribute('data-state')

// ── 1. the Subscribe sheet ───────────────────────────────────────────────────

test.describe('the Subscribe sheet', () => {
  test('opens from the masthead with the email field focused, the State menu follows, and Cancel puts the article back', async ({ page }) => {
    watch(page, 'designer opening the Slack Water Subscribe sheet')
    const dialog = await openSlack(page)
    const sc = scene(dialog)
    await expect(trigger(dialog)).toContainText('Article')
    await expect(sheet(dialog), 'no sheet on the article').toHaveCount(0)

    await sc.getByRole('button', { name: 'Subscribe', exact: true }).click()
    await expect(sheet(dialog)).toBeVisible()
    await expect(sheet(dialog).getByRole('heading', { name: 'Subscribe to Slack Water' })).toBeVisible()
    await expect(sheet(dialog).getByLabel('Email address'), 'the field takes focus').toBeFocused()
    await expect(trigger(dialog), 'the State menu moved to the sheet').toContainText('Subscribe sheet')
    await expect.poll(() => shown(dialog)).toBe('subscribe')
    await expect(sheet(dialog).locator('.sw-err'), 'no error before anything is typed').toHaveCount(0)

    await sheet(dialog).getByRole('button', { name: 'Cancel' }).click()
    await expect(sheet(dialog)).toHaveCount(0)
    await expect(trigger(dialog), 'the State menu moved back').toContainText('Article')
    await expect.poll(() => shown(dialog)).toBe('article')
  })

  test('the State menu opens and closes the sheet too, and its error entry shows the email error', async ({ page }) => {
    watch(page, 'designer walking the Slack Water State menu')
    const dialog = await openSlack(page)
    await trigger(dialog).click()
    await expect(dialog.getByRole('menuitemradio')).toHaveText(STATES)
    await dialog.getByRole('menuitemradio', { name: 'Subscribe sheet', exact: true }).click()
    await expect(sheet(dialog)).toBeVisible()
    await expect(sheet(dialog).locator('.sw-err')).toHaveCount(0)

    await pickPreviewState(dialog, 'Subscribe, email error')
    await expect.poll(() => shown(dialog)).toBe('error')
    await expect(sheet(dialog).locator('.sw-err'), 'the error entry shows the error').toBeVisible()
    await expect(sheet(dialog).getByLabel('Email address')).toHaveAttribute('aria-invalid', 'true')

    await pickPreviewState(dialog, 'Article')
    await expect(sheet(dialog)).toHaveCount(0)
    await expect.poll(() => shown(dialog)).toBe('article')
  })

  test('a half-typed address gets the error in words and a shape, and a whole one clears it', async ({ page }) => {
    watch(page, 'designer typing a bad email into Slack Water')
    const dialog = await openSlack(page)
    await scene(dialog).getByRole('button', { name: 'Subscribe', exact: true }).click()
    const field = sheet(dialog).getByLabel('Email address')
    await field.fill('ana@')
    await sheet(dialog).getByRole('button', { name: 'Continue' }).click()

    const err = sheet(dialog).locator('.sw-err')
    await expect(err, 'the error shows after a try').toBeVisible()
    await expect(err).toContainText('Enter an email address like')
    await expect(err, 'a shape as well as words').toContainText('▲')
    await expect(field).toHaveAttribute('aria-invalid', 'true')
    await expect(field, 'the field points at its error').toHaveAttribute('aria-describedby', 'sw-email-err')
    await expect(sheet(dialog).getByRole('status'), 'nothing was accepted').toHaveCount(0)

    await field.fill('ana@harbour.com.au')
    await expect(err, 'a usable address clears the error').toHaveCount(0)
    await expect(field).toHaveAttribute('aria-invalid', 'false')
  })

  test('a good address shows the preview-only confirmation, sends nothing, and Close puts the article back', async ({ page }) => {
    watch(page, 'designer subscribing in the Slack Water preview')
    const seen = []
    const dialog = await openSlack(page, { seen })
    await scene(dialog).getByRole('button', { name: 'Subscribe', exact: true }).click()
    const email = 'priya.nair@harbour.com.au'
    await sheet(dialog).getByLabel('Email address').fill(email)
    const mark = seen.length
    await sheet(dialog).getByRole('button', { name: 'Continue' }).click()

    const done = sheet(dialog).getByRole('status')
    await expect(done).toContainText('You are on the list')
    await expect(done, 'it says it is a preview').toContainText('this is a preview')
    await expect(sheet(dialog).getByRole('button', { name: 'Continue' }), 'the form is gone').toHaveCount(0)
    await expect(sheet(dialog).locator('.sw-err')).toHaveCount(0)
    // Nothing leaves the page: no request after the click carries the address.
    await page.waitForTimeout(300)
    const leaked = seen.slice(mark).filter((r) => r.url.includes('priya') || r.post.includes('priya'))
    expect(leaked, 'the address was sent somewhere').toEqual([])

    await sheet(dialog).getByRole('button', { name: 'Close' }).click()
    await expect(sheet(dialog)).toHaveCount(0)
    await expect(trigger(dialog)).toContainText('Article')
    // Opening it again starts clean.
    await scene(dialog).getByRole('button', { name: 'Subscribe', exact: true }).click()
    await expect(sheet(dialog).getByLabel('Email address')).toHaveValue('')
    await expect(sheet(dialog).getByRole('status')).toHaveCount(0)
  })
})

// ── 2. Escape ────────────────────────────────────────────────────────────────

test.describe('Escape', () => {
  // Same contract as the State menu in 197: Escape closes the open layer and not the dialog,
  // and a second Escape closes the dialog. The Subscribe sheet is a layer a person opened.
  test('closes the Subscribe sheet and not the dialog, and a second Escape closes the dialog', async ({ page }) => {
    watch(page, 'keyboard user escaping the Slack Water Subscribe sheet')
    const dialog = await openSlack(page)
    await scene(dialog).getByRole('button', { name: 'Subscribe', exact: true }).click()
    await expect(sheet(dialog).getByLabel('Email address')).toBeFocused()

    await page.keyboard.press('Escape')
    await expect(dialog, 'Escape closed the sheet and not the dialog').toBeVisible()
    await expect(sheet(dialog)).toHaveCount(0)
    await expect(trigger(dialog)).toContainText('Article')

    await page.keyboard.press('Escape')
    await expect(dialog, 'a second Escape closes the dialog').toHaveCount(0)
  })
})

// ── 3. the nav ───────────────────────────────────────────────────────────────

test.describe('the nav', () => {
  test('swaps the panel under the story: Issues, Ferries, Tides, and back', async ({ page }) => {
    watch(page, 'designer clicking through the Slack Water nav')
    const dialog = await openSlack(page)
    const sc = scene(dialog)
    const nav = sc.getByRole('navigation', { name: 'Slack Water' })
    const panel = sc.locator('.sw-panel')
    const current = (name) => nav.getByRole('button', { name, exact: true })

    await expect(current('Issues')).toHaveAttribute('aria-current', 'page')
    await expect(panel.getByRole('heading', { name: 'In this issue' })).toBeVisible()
    await expect(panel).toContainText('Eleven wharves, one tide table')

    await current('Ferries').click()
    await expect(current('Ferries')).toHaveAttribute('aria-current', 'page')
    await expect(current('Issues'), 'only one item is current').not.toHaveAttribute('aria-current', 'page')
    await expect(panel).toHaveCount(1)
    await expect(panel.getByRole('heading', { name: 'Leaving Circular Quay, Wharf 3' })).toBeVisible()
    await expect(panel).toContainText('7:42')
    await expect(panel, 'the old panel is gone').not.toContainText('Eleven wharves')

    await current('Tides').click()
    await expect(current('Tides')).toHaveAttribute('aria-current', 'page')
    await expect(panel.getByRole('heading', { name: 'Sydney Heads today' })).toBeVisible()
    await expect(panel).toContainText('High tide')
    await expect(panel).toContainText('Low tide')
    await expect(panel).not.toContainText('7:42')
    await expect(sc.locator('.sw-ul'), 'one underline, under the current item').toHaveCount(1)
    await expect(current('Tides').locator('.sw-ul')).toHaveCount(1)

    await current('Issues').click()
    await expect(panel.getByRole('heading', { name: 'In this issue' })).toBeVisible()
  })
})

// ── 4. the ferry slider ──────────────────────────────────────────────────────

test.describe('the ferry slider', () => {
  test('moves the time readout from 7:12 to 7:42 and the ferry from one wharf to the other', async ({ page }) => {
    watch(page, 'designer following the 7:12 across the harbour')
    const dialog = await openSlack(page)
    const sc = scene(dialog)
    const slider = sc.getByRole('slider', { name: 'Follow the 7:12 across the harbour' })
    await slider.scrollIntoViewIfNeeded()
    const time = sc.locator('.sw-time')
    const where = sc.locator('.sw-readout')
    const ferryX = async () => (await sc.locator('.sw-ferry').boundingBox()).x
    const wharfX = async (i) => (await sc.locator('.sw-wharf').nth(i).boundingBox()).x
    const near = (a, b) => Math.abs(a - b)

    await slider.fill('0')
    await expect(time).toHaveText('7:12 am')
    await expect(where).toContainText('Leaving Circular Quay')
    await expect.poll(async () => near(await ferryX(), await wharfX(0)), 'at 0% the ferry is at Circular Quay').toBeLessThan(4)
    const start = await ferryX()

    await slider.fill('50')
    await expect(time).toHaveText('7:27 am')
    await expect(where).toContainText('Off Bradleys Head')
    await expect.poll(ferryX, 'the ferry moved').toBeGreaterThan(start + 40)
    const mid = await ferryX()

    await slider.fill('100')
    await expect(time).toHaveText('7:42 am')
    await expect(where).toContainText('Alongside at Manly')
    await expect.poll(async () => near(await ferryX(), await wharfX(1)), 'at 100% the ferry is at Manly').toBeLessThan(4)
    expect(await ferryX(), 'further along than halfway').toBeGreaterThan(mid + 40)
    await expect(slider).toHaveAttribute('aria-valuetext', '7:42 am, Alongside at Manly')
  })

  test('the keyboard moves it: End is 7:42, Home is 7:12', async ({ page }) => {
    watch(page, 'keyboard user following the 7:12')
    const dialog = await openSlack(page)
    const sc = scene(dialog)
    const slider = sc.getByRole('slider', { name: 'Follow the 7:12 across the harbour' })
    await slider.focus()
    await page.keyboard.press('End')
    await expect(sc.locator('.sw-time')).toHaveText('7:42 am')
    await page.keyboard.press('Home')
    await expect(sc.locator('.sw-time')).toHaveText('7:12 am')
    await page.keyboard.press('ArrowRight')
    await expect(sc.locator('.sw-time'), 'one step is not yet a minute').toHaveText('7:12 am')
    await expect(slider).toHaveValue('1')
  })
})

// ── 4b. the map's place names ────────────────────────────────────────────────
// The drawing is cropped to cover its box, so a place name cannot sit at a fixed fraction of the
// box: it is placed from the same crop, and kept inside the box. At every width each name is
// inside the map, no two overlap, none covers a wharf dot, and the two wharves carry theirs:
// Circular Quay's name is below its dot and Manly's is to the right of its dot and within a label's height of it (it sits level with its dot at 768 and up: LABEL_AT.right puts its top 4px under the point).
//
// To make it go red (undo it after): in SlackWater.jsx CrossingMap's `place`, set `k` to
// `bw / w` and `oy` to `0`; or revert to a0eb72a4~1 for SlackWater.jsx and SlackWater.css.
test.describe('the map labels', () => {
  const measure = (sc) => sc.locator('.sw-map').evaluate((map) => {
    const box = map.getBoundingClientRect()
    const rect = (el) => { const r = el.getBoundingClientRect(); return { l: r.left, t: r.top, r: r.right, b: r.bottom, cx: (r.left + r.right) / 2, cy: (r.top + r.bottom) / 2 } }
    return {
      box: rect(map),
      names: [...map.querySelectorAll('.sw-pl')].map((el) => ({ name: el.textContent.trim(), ...rect(el), shown: getComputedStyle(el).visibility !== 'hidden' })),
      wharves: [...map.querySelectorAll('.sw-wharf')].map(rect),
      width: box.width,
    }
  })
  const overlap = (a, b) => a.l < b.r && b.l < a.r && a.t < b.b && b.t < a.b

  for (const [width, height, mobile] of [[390, 844, true], [768, 900, false], [1440, 900, false]]) {
    test.describe(`at ${width}px`, () => {
      test.use({ viewport: { width, height }, ...(mobile ? { hasTouch: true, isMobile: true } : {}) })

      test('every place name is inside the map, clear of the others and of the wharf dots, and Quay and Manly sit by their dots', async ({ page }) => {
        watch(page, `designer reading the Slack Water map at ${width}px`)
        const dialog = await openSlack(page)
        const sc = scene(dialog)
        await sc.locator('.sw-map').scrollIntoViewIfNeeded()
        await expect(sc.locator('.sw-pl').first(), 'the labels are placed, not left hidden').toBeVisible()
        await expect.poll(async () => (await measure(sc)).names.every((n) => n.shown), 'every name is placed').toBe(true)
        const m = await measure(sc)
        expect(m.names.map((n) => n.name), 'the five places').toEqual(['Circular Quay', 'Fort Denison', 'Bradleys Head', 'North Head', 'Manly'])
        const slack = 0.5
        for (const n of m.names) {
          expect(n.l, `${n.name} runs off the map's left edge`).toBeGreaterThanOrEqual(m.box.l - slack)
          expect(n.r, `${n.name} runs off the map's right edge`).toBeLessThanOrEqual(m.box.r + slack)
          expect(n.t, `${n.name} runs off the map's top`).toBeGreaterThanOrEqual(m.box.t - slack)
          expect(n.b, `${n.name} runs off the map's bottom`).toBeLessThanOrEqual(m.box.b + slack)
        }
        for (let i = 0; i < m.names.length; i++) {
          for (let j = i + 1; j < m.names.length; j++) expect(overlap(m.names[i], m.names[j]), `${m.names[i].name} overlaps ${m.names[j].name}`).toBe(false)
          for (const [w, dot] of m.wharves.entries()) expect(overlap(m.names[i], dot), `${m.names[i].name} covers wharf dot ${w + 1}`).toBe(false)
        }
        const [quay, manly] = [m.names[0], m.names[4]]
        const [dotQ, dotM] = m.wharves
        expect(Math.abs(quay.cx - dotQ.cx), 'Circular Quay is not under its dot').toBeLessThanOrEqual(quay.r - quay.l)
        expect(quay.t, 'Circular Quay is not below its dot').toBeGreaterThanOrEqual(dotQ.b - slack)
        expect(manly.l, 'Manly is not to the right of its dot').toBeGreaterThanOrEqual(dotM.r - slack)
        expect(Math.abs(manly.cy - dotM.cy), 'Manly is not beside its dot (within one label height)').toBeLessThanOrEqual(16)
        expect(manly.l - dotM.r, 'Manly is far from its dot').toBeLessThanOrEqual(24)
      })
    })
  }
})

// ── 5. Save ──────────────────────────────────────────────────────────────────

test.describe('Save', () => {
  test('flips between "Save for later" and "Saved" and says which in aria-pressed', async ({ page }) => {
    watch(page, 'designer saving the Slack Water story')
    const dialog = await openSlack(page)
    const sc = scene(dialog)
    const off = sc.getByRole('button', { name: 'Save for later' })
    await expect(off).toHaveAttribute('aria-pressed', 'false')
    await off.click()
    const on = sc.getByRole('button', { name: 'Saved' })
    await expect(on).toHaveAttribute('aria-pressed', 'true')
    await expect(sc.getByRole('button', { name: 'Save for later' })).toHaveCount(0)
    await on.click()
    await expect(sc.getByRole('button', { name: 'Save for later' })).toHaveAttribute('aria-pressed', 'false')
  })
})

// ── 6. the compare view ──────────────────────────────────────────────────────

test.describe('the compare view', () => {
  test('shows Slack Water twice as a still picture: no buttons, no inputs, no slider, no links', async ({ page }) => {
    watch(page, 'designer comparing a suggested palette on Slack Water')
    await seed(page, MID)
    await signIn(page, { plan: 'pro' })
    await go(page, '/create/palette')
    await clickPaletteAction(page, 'Suggest variations')
    const compare = page.getByRole('button', { name: /^Compare .* with your palette$/ }).first()
    await expect(compare).toBeVisible()
    await compare.click()
    const dialog = page.getByRole('dialog', { name: 'Palette preview' })
    await expect(dialog.getByText('Compare palettes')).toBeVisible()
    await dialog.getByRole('option', { name: /^Editorial hero/ }).click()

    const panes = dialog.locator('.pvd-stage.is-compare .pvd-pane')
    await expect(panes).toHaveCount(2)
    await expect(panes.locator(`.pvs[data-preview-scene="${SCENE}"] .sw`)).toHaveCount(2)
    for (const i of [0, 1]) {
      const pane = panes.nth(i)
      await expect(pane.locator('.sw-name'), `pane ${i}: the scene has drawn`).toBeVisible()
      await expect(pane.locator('.pvs'), `pane ${i}: one picture, not a group of controls`).toHaveAttribute('role', 'img')
      await expect(pane.locator('.sw').first()).not.toHaveClass(/is-live/)
      for (const sel of ['button', 'input', '[role="slider"]', '[role="tab"]', '[role="switch"]', 'a[href]', '[aria-pressed]']) {
        await expect(pane.locator('.pvs').locator(sel), `pane ${i}: no ${sel}`).toHaveCount(0)
      }
      // The map and the nav are still there, as drawing.
      await expect(pane.locator('.sw-navi')).toHaveCount(3)
      await expect(pane.locator('.sw-time'), `pane ${i}: the readout is printed`).toBeVisible()
    }
    // The dialog's own button (Use ...) is outside the scene and still there.
    await expect(dialog.getByRole('button', { name: /^Use / })).toBeVisible()
  })
})

// ── 7. which photograph loads ────────────────────────────────────────────────

const WIDE = /\/previews\/ferry\/ferry-morning-(?:640|1080)\.(?:avif|webp)/
const PORTRAIT = /\/previews\/ferry\/ferry-morning-portrait-(?:480|752)\.(?:avif|webp)/

/** Wait until the scene's photograph has loaded and report the file the browser chose. */
async function loadedPhoto(page, dialog) {
  const img = scene(dialog).locator('img.sw-img')
  await expect(img).toBeVisible()
  await expect.poll(() => img.evaluate((i) => i.complete && i.naturalWidth > 0), 'the photograph loaded').toBe(true)
  return img.evaluate((i) => ({ src: i.currentSrc, natural: i.naturalWidth, box: i.getBoundingClientRect().toJSON() }))
}

test.describe('the photograph', () => {
  test('at 1440 the wide picture loads and the portrait one never does', async ({ page }) => {
    watch(page, 'designer opening Slack Water on a desktop')
    const seen = []
    const dialog = await openSlack(page, { seen })
    const photo = await loadedPhoto(page, dialog)
    expect(photo.src, 'the browser chose the wide picture').toMatch(WIDE)
    expect(photo.box.width, 'the picture is wider than it is tall').toBeGreaterThan(photo.box.height * 1.5)
    await page.waitForTimeout(500)
    expect(seen.filter((r) => PORTRAIT.test(r.url)).map((r) => r.url), 'the portrait crop was fetched on a desktop').toEqual([])
    expect(seen.filter((r) => WIDE.test(r.url)).length, 'the wide picture was requested').toBeGreaterThan(0)
  })

  test.describe('on a phone', () => {
    test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true })

    test('at 390 the portrait picture loads and the wide one never does', async ({ page }) => {
      watch(page, 'designer opening Slack Water on a phone')
      const seen = []
      const dialog = await openSlack(page, { seen })
      const photo = await loadedPhoto(page, dialog)
      expect(photo.src, 'the browser chose the upright picture').toMatch(PORTRAIT)
      expect(photo.box.height, 'the picture is taller than it is wide').toBeGreaterThan(photo.box.width * 0.75)
      await page.waitForTimeout(500)
      expect(seen.filter((r) => WIDE.test(r.url)).map((r) => r.url), 'the wide picture was fetched on a phone').toEqual([])
      expect(seen.filter((r) => PORTRAIT.test(r.url)).length, 'the portrait picture was requested').toBeGreaterThan(0)
    })

    // ── 9. the sheet on a phone ────────────────────────────────────────────────
    test('the Subscribe sheet opens inside the screen, takes a typed address, and Cancel closes it', async ({ page }) => {
      watch(page, 'designer tapping Subscribe on a phone')
      const dialog = await openSlack(page)
      await scene(dialog).getByRole('button', { name: 'Subscribe', exact: true }).tap()
      await expect(sheet(dialog)).toBeVisible()
      const box = await sheet(dialog).boundingBox()
      expect(box.x, 'the sheet starts on the screen').toBeGreaterThanOrEqual(0)
      expect(box.x + box.width, 'the sheet ends on the screen').toBeLessThanOrEqual(390.5)
      await sheet(dialog).getByLabel('Email address').fill('ana@')
      await sheet(dialog).getByRole('button', { name: 'Continue' }).tap()
      await expect(sheet(dialog).locator('.sw-err')).toBeVisible()
      const err = await sheet(dialog).locator('.sw-err').boundingBox()
      expect(err.x + err.width, 'the error fits the screen').toBeLessThanOrEqual(390.5)
      await sheet(dialog).getByRole('button', { name: 'Cancel' }).tap()
      await expect(sheet(dialog)).toHaveCount(0)
      await expect.poll(() => shown(dialog)).toBe('article')
    })
  })
})

// ── 8. contrast ──────────────────────────────────────────────────────────────

/**
 * For each text node: the worst ratio over five points, against the ground painted there
 * (the browser's own hit test, an SVG shape counting by its fill). Runs in the page.
 * Returns rows, plus anything it could not measure, so nothing passes by being skipped.
 */
function sweepContrast() {
  const root = document.querySelector('.pvs')
  const lin = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4 }
  const lum = (c) => 0.2126 * lin(c[0]) + 0.7152 * lin(c[1]) + 0.0722 * lin(c[2])
  const ratio = (a, b) => { const hi = Math.max(lum(a), lum(b)); const lo = Math.min(lum(a), lum(b)); return (hi + 0.05) / (lo + 0.05) }
  const parse = (s) => {
    s = (s || '').trim()
    let m = s.match(/^rgba?\(([^)]+)\)$/)
    if (m) { const p = m[1].split(/[\s,/]+/).filter(Boolean).map(Number); return [p[0], p[1], p[2], p.length > 3 ? p[3] : 1] }
    m = s.match(/^color\(srgb ([^)]+)\)$/)
    if (m) { const p = m[1].split(/[\s/]+/).filter(Boolean).map(Number); return [p[0] * 255, p[1] * 255, p[2] * 255, p.length > 3 ? p[3] : 1] }
    return null
  }
  const over = (fg, bg) => [0, 1, 2].map((i) => fg[i] * fg[3] + bg[i] * (1 - fg[3]))
  const hex = (c) => '#' + c.map((v) => Math.round(v).toString(16).padStart(2, '0')).join('')
  const problems = []
  const rows = []
  const cls = (e) => String(e.className?.baseVal ?? e.className ?? '') || e.tagName
  const hitTest = document.createElement('style')
  hitTest.textContent = '.pvs, .pvs * { pointer-events: auto !important }'
  document.head.append(hitTest)

  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
  const done = new Set()
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    if (!n.nodeValue.trim()) continue
    const el = n.parentElement
    if (done.has(el)) continue
    const cs = getComputedStyle(el)
    if (cs.display === 'none' || cs.visibility === 'hidden') continue
    done.add(el)
    { const hb = el.getBoundingClientRect(); if (hb.width <= 1 && hb.height <= 1 && cs.clipPath !== 'none') continue }
    el.scrollIntoView({ block: 'center', inline: 'center' })
    const range = document.createRange()
    range.selectNodeContents(n)
    const lines = [...range.getClientRects()].filter((r) => r.width > 1 && r.height > 1)
    if (!lines.length) continue
    const label = `${cls(el)} "${n.nodeValue.trim().slice(0, 22)}"`
    const fg = parse(cs.color)
    if (!fg) { problems.push(`${label}: cannot parse text colour ${cs.color}`); continue }
    let op = 1
    for (let a = el; a && a !== root.parentElement; a = a.parentElement) op *= parseFloat(getComputedStyle(a).opacity)
    fg[3] *= op

    let worst = null
    let reached = 0
    let underSheet = 0
    for (const r of lines) {
      for (const [fx, fy] of [[0.5, 0.5], [0.15, 0.3], [0.85, 0.3], [0.15, 0.7], [0.85, 0.7]]) {
        const x = r.left + r.width * fx
        const y = r.top + r.height * fy
        if (x < 0 || y < 0 || x >= innerWidth || y >= innerHeight) continue
        const stack = document.elementsFromPoint(x, y)
        const at = stack.findIndex((e) => e === el || el.contains(e))
        if (at < 0) { problems.push(`${label}: covered or clipped at a point`); continue }
        const above = stack.slice(0, at).find((e) => !e.contains(el) && (parse(getComputedStyle(e).backgroundColor)?.[3] > 0 || [...e.childNodes].some((c) => c.nodeType === 3 && c.nodeValue.trim())))
        // The Subscribe sheet hangs over the article on purpose: a point under it is not on screen, so it is
        // not rated (the sheet's own text is). Any other cover is a finding.
        if (above?.closest('.sw-dock')) { underSheet++; continue }
        if (above) problems.push(`${label}: covered by .${cls(above)}`)
        reached++
        const layers = []
        let imageUnder = null
        for (const e of stack.slice(at)) {
          const s = getComputedStyle(e)
          const svgShape = e instanceof SVGElement && !(e instanceof SVGSVGElement)
          let c
          let a
          if (svgShape) {
            c = s.fill === 'none' ? null : parse(s.fill)
            a = c ? c[3] * parseFloat(s.fillOpacity) * parseFloat(s.opacity) : 0
          } else {
            c = parse(s.backgroundColor)
            a = c ? c[3] * parseFloat(s.opacity) : 0
            if (s.backgroundImage && s.backgroundImage !== 'none') imageUnder = e
          }
          if (c && a > 0) layers.push([c[0], c[1], c[2], a])
          if (a >= 0.999 || e === root) break
        }
        if (imageUnder) { problems.push(`${label}: a background image under the text (.${cls(imageUnder)})`); continue }
        let ground = [255, 255, 255]
        for (let i = layers.length - 1; i >= 0; i--) ground = over(layers[i], ground)
        const ink = over(fg, ground)
        const rr = ratio(ink, ground)
        if (!worst || rr < worst.ratio) worst = { ratio: rr, ink, ground }
      }
    }
    if (!reached) { if (!underSheet) problems.push(`${label}: no point of it could be reached (all covered or off screen)`); continue }
    if (!worst) continue
    rows.push({ label, size: parseFloat(cs.fontSize), ratio: Math.round(worst.ratio * 100) / 100, ink: hex(worst.ink), ground: hex(worst.ground) })
  }
  hitTest.remove()
  return { rows, problems: [...new Set(problems)] }
}

test.describe('contrast on the real ground', () => {
  const PALETTES = { default: MID, ...STRESS }
  for (const [name, colors] of Object.entries(PALETTES)) {
    test(`all scene text clears 4.5:1 for the ${name} palette, light and dark, in all three states`, async ({ page }) => {
      test.setTimeout(150000)
      watch(page, `designer checking the ${name} palette on Slack Water`)
      const dialog = await openSlack(page, { colors })
      const root = scene(dialog)
      // The seed reached the engine, slot for slot: without this a green run could be
      // measuring whatever palette the app happened to restore.
      const slots = await root.evaluate((el) => ['--pv-primary', '--pv-secondary', '--pv-accent', '--pv-subtle', '--pv-deep'].map((n) => getComputedStyle(el).getPropertyValue(n).trim().toLowerCase()))
      expect(slots, `the ${name} palette did not reach the preview, slot for slot`).toEqual(colors)

      const misses = []
      const unmeasured = []
      const grounds = new Set()
      let measured = 0
      for (const theme of ['Light', 'Dark']) {
        const group = dialog.getByRole('group', { name: 'Preview theme' })
        await group.getByRole('button', { name: theme, exact: true }).click()
        await expect(root).toHaveAttribute('data-mode', theme.toLowerCase())
        grounds.add(await root.evaluate((el) => getComputedStyle(el).getPropertyValue('--pv-canvas').trim()))
        for (const state of STATES) {
          await pickPreviewState(dialog, state)
          await expect.poll(() => shown(dialog)).toBe({ Article: 'article', 'Subscribe sheet': 'subscribe', 'Subscribe, email error': 'error' }[state])
          // Colours ease on the live controls; measure them at rest.
          await page.evaluate(async () => { await document.fonts.ready; for (const a of document.getAnimations()) { try { a.finish() } catch { /* an endless one */ } } })
          const { rows, problems } = await page.evaluate(sweepContrast)
          const at = `${name}/${state}/${theme}`
          expect(rows.length, `${at}: text nodes measured`).toBeGreaterThan(state === 'Article' ? 30 : 25)
          measured += rows.length
          for (const p of problems) unmeasured.push(`${at} ${p}`)
          for (const r of rows) {
            if (r.ratio < 4.5) misses.push(`${at} ${r.label} ${r.ink} on ${r.ground} = ${r.ratio}:1 at ${r.size}px`)
          }
        }
      }
      expect(grounds.size, 'light and dark painted the same canvas: the toggle did not take').toBe(2)
      expect(unmeasured, 'text this sweep could not rate').toEqual([])
      expect(misses, `text under 4.5:1 over ${measured} measured nodes:\n${misses.join('\n')}`).toEqual([])
    })
  }
})

// ── 10. what it costs over the network ───────────────────────────────────────

/** Bytes over the wire for one finished request (headers and body), or 0 when the browser did not say. */
async function wire(req) {
  const s = await req.sizes().catch(() => null)
  return s ? s.responseBodySize + s.responseHeadersSize : 0
}

/**
 * Open the preview with a clean cache and add up what the open scene itself fetched: its
 * chunk and stylesheet, its two fonts and the photograph. The shared dialog, the app and
 * the neighbouring previews it warms up when idle are not this scene's weight.
 */
async function previewWeight(page) {
  const done = []
  page.on('requestfinished', (r) => done.push(r))
  await seed(page, MID)
  await signIn(page, { plan: 'pro' })
  await go(page, '/create/palette')
  const mark = done.length
  await clickPaletteAction(page, 'Preview')
  const dialog = page.getByRole('dialog', { name: 'Palette preview' })
  await expect(dialog.locator(`.pvs[data-preview-scene="${SCENE}"] .sw`)).toBeVisible()
  await loadedPhoto(page, dialog)
  await page.evaluate(() => document.fonts.ready)
  await page.waitForTimeout(800)
  const parts = { images: 0, fonts: 0, code: 0 }
  const files = []
  const counted = new Set()
  for (const r of done.slice(mark)) {
    const u = new URL(r.url())
    // The browser reports a preloaded picture twice (the preload and the <img>); it crossed the wire once.
    if (counted.has(u.pathname)) continue
    counted.add(u.pathname)
    let kind = null
    if (u.pathname.startsWith('/previews/ferry/')) kind = 'images'
    else if (/^\/fonts\/(?:literata|geist)-latin\.woff2$/.test(u.pathname)) kind = 'fonts'
    else if (/^\/assets\/SlackWater-[^/]+\.(?:js|css)$/.test(u.pathname)) kind = 'code'
    if (!kind) continue
    const bytes = await wire(r)
    parts[kind] += bytes
    files.push(`${u.pathname} ${bytes}`)
  }
  return { ...parts, total: parts.images + parts.fonts + parts.code, files }
}

const KB = 1024
test.describe('the preview over the network', () => {
  test('at 1440 the scene costs at most 300 KB', async ({ page }) => {
    watch(page, 'designer on a desktop connection opening Slack Water')
    const w = await previewWeight(page)
    test.info().annotations.push({ type: 'weight-1440', description: `${w.total} bytes: images ${w.images}, fonts ${w.fonts}, code ${w.code}` })
    console.log(`slack water weight at 1440: ${w.total} bytes (images ${w.images}, fonts ${w.fonts}, code ${w.code})\n  ${w.files.join('\n  ')}`)
    expect(w.images, 'the photograph did not come over the network').toBeGreaterThan(10 * KB)
    expect(w.fonts, 'the scene fonts did not come over the network').toBeGreaterThan(20 * KB)
    expect(w.code, 'the scene chunk did not come over the network').toBeGreaterThan(2 * KB)
    // The spec's 300 KB budget is for the assets (section 3.2); the fonts have their own
    // (two files, 120 KB together) in scripts/check-preview-budget.mjs. Everything is held to 300 KB here.
    expect(w.images + w.code, `assets over the 300 KB budget:\n${w.files.join('\n')}`).toBeLessThanOrEqual(300 * KB)
    expect(w.total, `scene over 300 KB with its fonts:\n${w.files.join('\n')}`).toBeLessThanOrEqual(300 * KB)
  })

  test.describe('on a phone', () => {
    test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true })

    test('at 390 the scene costs at most 140 KB', async ({ page }) => {
      watch(page, 'designer on a phone connection opening Slack Water')
      const w = await previewWeight(page)
      test.info().annotations.push({ type: 'weight-390', description: `${w.total} bytes: images ${w.images}, fonts ${w.fonts}, code ${w.code}` })
      console.log(`slack water weight at 390: ${w.total} bytes (images ${w.images}, fonts ${w.fonts}, code ${w.code})\n  ${w.files.join('\n  ')}`)
      expect(w.images).toBeGreaterThan(10 * KB)
      // Assets only: the photograph and the scene's code. The two fonts (113 KB, the same
      // files as at 1440) are held by check-preview-budget.mjs, and take the total past 140 KB.
      expect(w.images + w.code, `assets over the 140 KB budget:\n${w.files.join('\n')}`).toBeLessThanOrEqual(140 * KB)
    })
  })
})
