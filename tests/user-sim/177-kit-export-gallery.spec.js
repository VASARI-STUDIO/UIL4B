// The export gallery that ends the brand-kit walkthrough, /projects/:id/export.
//
//   - Save at the end of the walkthrough lands on the gallery;
//   - the default pick is the book as a PDF, and a free account sees the trial button;
//   - that button goes to /checkout?plan=yearly&from=kit-gallery;
//   - a free pick (the UI kit) downloads at once;
//   - "Not now" opens the project;
//   - a free account is sent only blurred raster previews and never asks for a Pro file;
//   - at the free cap the walkthrough keeps its cap message and never opens the gallery;
//   - the fixed bar never covers the last line at 320, 390, 768 and 1440;
//   - the keyboard reaches design, file, "Not now" and the button, in that order.
//
// MUTATION (each break must fail the test named after it):
//   - Point the walkthrough's navigate() back at /projects/:id: "the walkthrough ends on the gallery" fails.
//   - Change the default in utils/kitGalleryPick.js: "the default pick" fails.
//   - Draw the previews with blurred={false} for a free account: "a free account is sent only blurred
//     previews" fails.
//   - Drop the bottom padding on .pxg: "the fixed bar never covers" fails at the width it overflows.
import { test, expect } from './base.js'
import { go, watch, signIn } from './helpers.js'

const rail = (page) => page.getByRole('region', { name: 'Brand kit walkthrough' })
const nameForm = (page) => page.getByRole('dialog', { name: 'Name your project' })
const GALLERY = '/projects/seed-1/export'
const SIZES = [
  { width: 320, height: 700 },
  { width: 390, height: 844 },
  { width: 768, height: 1024 },
  { width: 1440, height: 900 },
]

async function walkToSave(page) {
  await page.addInitScript(() => {
    try { if (window.innerWidth < 900 && !localStorage.getItem('vs-uikit-guide')) localStorage.setItem('vs-uikit-guide', '1') } catch { /* blocked */ }
  })
  await go(page, '/create/palette')
  if (!(await rail(page).count())) {
    await page.getByRole('button', { name: 'Create', exact: true }).click()
    await page.locator('.pnav-editorial-cta').click()
  }
  await expect(rail(page)).toBeVisible()
  for (const [button, url] of [
    [/^Next: Fonts/, /\/create\/font-pair$/],
    [/^Next: Type scale/, /\/create\/type-scale$/],
    [/^Next: Icons/, /\/create\/icons$/],
  ]) {
    await rail(page).getByRole('button', { name: button }).click()
    await expect(page).toHaveURL(url)
  }
  await rail(page).getByRole('button', { name: /^Name your project/ }).click()
  await nameForm(page).getByRole('textbox', { name: 'Project name' }).fill('Harbour Studio')
  await nameForm(page).getByRole('button', { name: 'Save project' }).click()
}

const cta = (page) => page.locator('.pxg-cta')

test.describe('the export gallery', () => {
  test('the walkthrough ends on the gallery, with the project already saved', async ({ page }) => {
    watch(page, 'a free designer finishing the brand kit')
    await signIn(page, { plan: 'free', projects: 0 })
    await walkToSave(page)
    await expect(page).toHaveURL(/\/projects\/[a-z0-9]+\/export$/)
    await expect(page.getByRole('heading', { name: 'Choose a design for Harbour Studio' })).toBeVisible()
    const saved = await page.evaluate(() => Object.values(JSON.parse(localStorage.getItem('vs-projects') || '{}')).flat())
    expect(saved).toHaveLength(1)
  })

  test('the default pick is the book as a PDF and a free account sees the trial button', async ({ page }) => {
    watch(page, 'a free designer on the gallery')
    await signIn(page, { plan: 'free', projects: 1 })
    await go(page, GALLERY)
    await expect(page.getByRole('radio', { name: /Design system book/ })).toBeChecked()
    await expect(page.getByRole('radio', { name: /PDF/ })).toBeChecked()
    await expect(cta(page)).toHaveText('Continue for 7-day free trial')
  })

  test('the trial button goes to checkout on the yearly plan, marked as from the gallery', async ({ page }) => {
    watch(page, 'a free designer choosing a Pro file')
    await signIn(page, { plan: 'free', projects: 1 })
    await go(page, GALLERY)
    await expect(cta(page)).toBeEnabled()
    await cta(page).click()
    await expect(page).toHaveURL(/\/checkout\?plan=yearly&from=kit-gallery$/)
    await expect(page.getByRole('link', { name: /Back to Plans/ })).toBeVisible()
  })

  test('a free pick exports straight away', async ({ page }) => {
    watch(page, 'a free designer exporting the UI kit')
    await signIn(page, { plan: 'free', projects: 1 })
    await go(page, GALLERY)
    await page.getByRole('radio', { name: /UI kit/ }).check({ force: true })
    await expect(cta(page)).toHaveText('Export HTML')
    const [file] = await Promise.all([page.waitForEvent('download'), cta(page).click()])
    expect(file.suggestedFilename()).toMatch(/\.(html|zip)$/)
    await expect(cta(page)).toHaveText('Export again')
  })

  test('"Not now" opens the project', async ({ page }) => {
    watch(page, 'a free designer leaving the gallery')
    await signIn(page, { plan: 'free', projects: 1 })
    await go(page, GALLERY)
    await page.getByRole('link', { name: /^Not now/ }).click()
    await expect(page).toHaveURL(/\/projects\/seed-1$/)
  })

  test('a free account is sent only blurred previews and never asks for a Pro file', async ({ page }) => {
    watch(page, 'a free account looking at Pro designs')
    const asked = []
    await page.route('**/api/ai?export=document', (route) => { asked.push(route.request().url()); route.abort() })
    await signIn(page, { plan: 'free', projects: 1 })
    await go(page, GALLERY)
    const thumbs = page.locator('.pxg-card--book .exp-thumb[data-blurred]')
    await expect(thumbs).toHaveCount(3)
    for (const img of await page.locator('.pxg-card--book img, .pxg-card--guidelines img').all()) {
      await expect(img).toHaveAttribute('data-blurred', 'true')
      expect(await img.getAttribute('src')).toMatch(/^blob:/)
      expect(await img.evaluate((el) => el.naturalWidth)).toBeLessThanOrEqual(400)
    }
    await cta(page).click()
    expect(asked, 'a free account asked the server for a Pro file').toHaveLength(0)
  })

  test('at the free cap the walkthrough shows the cap message and never opens the gallery', async ({ page }) => {
    watch(page, 'a free designer with three projects')
    await signIn(page, { plan: 'free', projects: 3 })
    await walkToSave(page)
    const refusal = page.getByTestId('brand-kit-save-refusal')
    await expect(refusal).toContainText('Free plan saves up to 3 projects')
    await expect(refusal.getByRole('link', { name: 'See what Pro adds' })).toHaveAttribute('href', '/plans')
    await expect(page).not.toHaveURL(/\/export$/)
  })

  for (const size of SIZES) {
    test(`${size.width}px: the fixed bar never covers the last line`, async ({ page }) => {
      watch(page, `a designer at ${size.width}px`)
      await page.setViewportSize(size)
      await signIn(page, { plan: 'free', projects: 1 })
      await go(page, GALLERY)
      await expect(cta(page)).toBeVisible()
      await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight))
      const gap = await page.evaluate(() => {
        const note = document.querySelector('.pxg-note').getBoundingClientRect()
        const bar = document.querySelector('.pxg-bar').getBoundingClientRect()
        return bar.top - note.bottom
      })
      expect(gap, 'the note sits under the bar').toBeGreaterThanOrEqual(0)
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
      expect(overflow, 'the page scrolls sideways').toBeLessThanOrEqual(0)
      await page.screenshot({ path: `.claude/scratch/kitgallery/gallery-${size.width}.png` })
    })
  }

  test('the keyboard reaches design, file, Not now and the button in order', async ({ page }) => {
    watch(page, 'a keyboard user on the gallery')
    await page.setViewportSize({ width: 1440, height: 900 })
    await signIn(page, { plan: 'free', projects: 1 })
    await go(page, GALLERY)
    await expect(cta(page)).toBeEnabled()
    await page.locator('.pxg-saved a').focus()
    const order = []
    for (let i = 0; i < 6; i += 1) {
      await page.keyboard.press('Tab')
      order.push(await page.evaluate(() => {
        const el = document.activeElement
        return el.name === 'pxg-design' ? 'design' : el.name === 'pxg-format' ? 'file' : el.classList.contains('pxg-not') ? 'not-now' : el.classList.contains('pxg-cta') ? 'cta' : el.className || el.tagName
      }))
    }
    const seq = order.filter((s) => ['design', 'file', 'not-now', 'cta'].includes(s))
    expect(seq.slice(0, 1)).toEqual(['design'])
    expect(seq.indexOf('file')).toBeGreaterThan(seq.indexOf('design'))
    expect(order.indexOf('not-now')).toBeGreaterThan(order.indexOf('file'))
    expect(order.indexOf('cta')).toBeGreaterThan(order.indexOf('not-now'))
  })
})
