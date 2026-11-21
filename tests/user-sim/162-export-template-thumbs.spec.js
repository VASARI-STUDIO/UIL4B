// THE TEMPLATE PICTURES: the stage and page gallery of the Export dialog, and the templates grid that changes them.
//
// Each theme has pictures of its own sample brand's pages (public/export-themes/<theme>-<key>.webp): the UI kit shows an app
// screen and a buttons page, the book its first page, the slides a cover and a palette page. This spec checks, as a person sees it:
//
//   1. Every picture of every theme is served as a real webp (a missing file would answer 200 with the app's page, so the
//      content type and the first bytes are read).
//   2. The stage draws the pictures of the chosen template, one page at a time (the gallery thumbnails pick the page), and their
//      alt names that template and its sample brand.
//   3. For a free account the book, slides and UI kit previews in a Pro theme are the real page at 1x (no retina version), sharp, under a
//      tiled "Pro sample" mark and a "Pro template" lock (the kit's dock says "Pro theme"). A Pro account sees no mark.
//   4. At 390 neither the preview nor the templates grid pushes the page or the dialog sideways.
//
// MUTATION
//   - exportPreviewData.js: the page address points at '.png'            -> tests 1 and 2
//   - ExportPreview: sample is always false for a free account          -> test 3
//   - ExportStage: the .xd-mark is left out, or the sample keeps its srcset -> test 3
import { test, expect } from './base.js'
import { go, watch, signIn } from './helpers.js'
import { chooseFormat, chooseTemplate, exportPanel, openTemplates } from './export-rows.js'

const BOARD = '/create/palette?c=1F4B8E,2E7BB8,3FA9A0'
const THEMES = [
  ['01-presentation', 'Presentation', 'Kerbside'], ['02-poster', 'Ticket', 'Encore'], ['03-broadsheet', 'Broadsheet', 'Saltbush'],
  ['04-standards', 'Standards', 'Two Shores'], ['05-specimen', 'Catalogue', 'Margin'], ['06-studio', 'Studio', 'Offcut'],
  ['07-spec', 'Specification', 'Northern Current'], ['08-monograph', 'Riso', 'Long Room'], ['09-blueprint', 'Blueprint', 'Plumbline'],
  ['10-inuse', 'In use', 'Shallow End'],
]
const KEYS = { kit: ['kitScreen', 'kitButtons'], book: ['book'], guidelines: ['guideCover', 'guidePalette'] }

async function open(page, plan, file, size) {
  if (size) await page.setViewportSize(size)
  await signIn(page, { plan })
  await go(page, BOARD)
  await page.getByRole('button', { name: 'Export', exact: true }).first().click()
  const panel = exportPanel(page)
  await expect(panel).toBeVisible()
  await chooseFormat(panel, file)
  return panel
}
/** Pick a template from the grid behind "View templates". The dialog goes back to the preview, whose "Show the default template" box
    starts clear again, so tick it (when it can be ticked) and the stage draws the stock picture whatever the live preview does. */
async function choose(page, panel, name) {
  await chooseTemplate(panel, name)
  await stock(panel)
}
/** A page the account cannot export: the real picture at 1x with no retina srcset, no blur, and the tiled mark over it that takes no clicks. */
async function expectSample(stage, panel) {
  const img = stage.locator('img')
  await expect(img).toHaveCount(1)
  await expect(img).toHaveAttribute('src', /^\/export-themes\/[\w-]+\.webp$/)
  await expect(img).not.toHaveAttribute('srcset', /.+/)
  expect(await img.evaluate((el) => getComputedStyle(el).filter), 'the sample is not blurred').toBe('none')
  const mark = stage.locator('.xd-mark')
  await expect(mark).toHaveCount(1)
  await expect(mark).toHaveAttribute('aria-hidden', 'true')
  expect(await mark.evaluate((el) => getComputedStyle(el).pointerEvents), 'the mark takes no clicks').toBe('none')
  // Gallery thumbnails of a template with several pages carry the mark too.
  for (const thumb of await panel.locator('.xd-thumb').all()) await expect(thumb.locator('.xd-mark')).toHaveCount(1)
}
async function stock(panel) {
  const box = panel.locator('.xd-stock input')
  if ((await box.isEnabled()) && !(await box.isChecked())) await box.check()
}

for (const [kind, keys] of Object.entries(KEYS)) {
  test(`every ${kind} picture of every template is served as a real webp`, async ({ page }) => {
    watch(page, `checking the ${kind} theme pictures`)
    await go(page, BOARD)
    for (const [id] of THEMES) {
      for (const key of keys) {
        const res = await page.request.get(`/export-themes/${id}-${key}.webp`)
        expect(res.status(), `${id}-${key}`).toBe(200)
        expect(res.headers()['content-type'], `${id}-${key}`).toBe('image/webp')
        const bytes = await res.body()
        expect(bytes.subarray(0, 4).toString('latin1'), `${id}-${key} starts RIFF`).toBe('RIFF')
        expect(bytes.subarray(8, 12).toString('latin1'), `${id}-${key} is WEBP`).toBe('WEBP')
      }
    }
  })

  test(`the ${kind} stage draws the chosen template’s pictures, named by template and sample brand`, async ({ page }) => {
    watch(page, `a Pro account moving through the templates on ${kind}`)
    const panel = await open(page, 'pro', kind)
    await stock(panel)
    for (const [id, name, brand] of [THEMES[0], THEMES[3], THEMES[9]]) {
      if (id !== '01-presentation') await choose(page, panel, name)
      const shot = panel.locator('.xd-box img')
      const thumbs = panel.locator('.xd-thumb')
      // One page is on the stage at a time; a template with several pages has a gallery with one thumbnail each.
      await expect(thumbs).toHaveCount(keys.length > 1 ? keys.length : 0)
      for (const [i, key] of keys.entries()) {
        if (keys.length > 1) await thumbs.nth(i).click()
        await expect(shot).toHaveCount(1)
        await expect(shot).toHaveAttribute('src', `/export-themes/${id}-${key}.webp`)
        await expect(shot).toHaveAttribute('alt', new RegExp(`^${name} theme, .* page, shown with the ${brand} sample brand$`))
        await expect.poll(() => shot.evaluate((el) => el.complete && el.naturalWidth), `${id}-${key} loads`).toBeGreaterThan(0)
      }
    }
  })
}

test.describe('sample and lock', () => {
  for (const file of ['book', 'guidelines']) {
    for (const [, name] of [THEMES[0], THEMES[3], THEMES[6], THEMES[9]]) {
      test(`${file} in ${name}: free sees a sharp 1x sample under the mark and locked, Pro sees it with no mark`, async ({ page, browser }) => {
        watch(page, `a free account looking at the ${file} preview in ${name}`)
        const panel = await open(page, 'free', file)
        await choose(page, panel, name)
        const stage = panel.locator('.xd-box')
        await expect(stage).toHaveClass(/is-locked/)
        await expect(panel.locator('.xd-stock input'), 'a template the account cannot export has only the stock picture').toBeDisabled()
        await expect(panel.locator('.xd-stage-pro')).toHaveText('Pro template')
        await expectSample(stage, panel)

        const ctx = await browser.newContext()
        const proPage = await ctx.newPage()
        watch(proPage, `a Pro account looking at the ${file} preview in ${name}`)
        const proPanel = await open(proPage, 'pro', file)
        await choose(proPage, proPanel, name)
        await expect(proPanel.locator('.xd-box')).not.toHaveClass(/is-locked/)
        await expect(proPanel.locator('.xd-stage-pro')).toHaveCount(0)
        await expect(proPanel.locator('.xd-mark')).toHaveCount(0)
        expect(await proPanel.locator('.xd-box img').first().evaluate((el) => getComputedStyle(el).filter)).toBe('none')
        await ctx.close()
      })
    }
  }

  test('free: the UI kit preview in a Pro template is a sharp 1x sample under the mark, with the Pro mark on it, and the dock says Pro theme', async ({ page }) => {
    watch(page, 'a free account looking at the kit in a Pro theme')
    const panel = await open(page, 'free', 'kit')
    await choose(page, panel, 'Studio')
    await expect(panel.locator('.xd-box')).toHaveClass(/is-locked/)
    await expectSample(panel.locator('.xd-box'), panel)
    await expect(panel.locator('.xd-stage-pro')).toHaveText('Pro template')
    await expect(panel.locator('.xd-dock')).toContainText('Pro theme.')
  })
})

for (const file of ['kit', 'book', 'guidelines']) {
  test(`at 390 the ${file} preview and the templates grid stay inside the dialog with no sideways scroll`, async ({ page }) => {
    watch(page, `a phone user on ${file}`)
    const panel = await open(page, 'pro', file, { width: 390, height: 844 })
    for (const name of ['Standards', 'Catalogue', 'Presentation']) {
      await openTemplates(panel)
      const open = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)
      expect(open, `${name}: the open grid does not push the page sideways`).toBe(false)
      await choose(page, panel, name)
      const fit = await page.evaluate(() => {
        const card = document.querySelector('.xd-card').getBoundingClientRect()
        const stage = document.querySelector('.xd-box').getBoundingClientRect()
        return { sideways: document.documentElement.scrollWidth > document.documentElement.clientWidth, inside: stage.left >= card.left - 1 && stage.right <= card.right + 1 }
      })
      expect(fit, name).toEqual({ sideways: false, inside: true })
    }
  })
}
