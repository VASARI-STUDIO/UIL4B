// THE HOMEPAGE CONVERTER SHOWS ONE PERCENTAGE: HOW MUCH SMALLER THE FILE GOT.
//
// The AFTER bar's label is plain, the Quality row prints no figure, and the one
// % on screen is the saving line above the bars. A quality figure on the label
// would contradict a bar drawn at the size of the file that is left.
//
// The tabs are Compress, 3D model, Video frames, Aspect ratio. Every pane stays
// mounted and the hidden ones are `visibility: hidden`, so the locators below
// are scoped to the pane that is on.
//
// The oracle is the rendered text of the panel (every `\d+%` token in its
// innerText, which leaves out hidden panes) and the drawn width of the AFTER
// bar against the saving it states.
// Run at 390 / 768 / 1440 in both themes, in the settled state and across a
// quality change, a format change and a switch to the lossless format.
import { test, expect } from './base.js'
import { go, watch } from './helpers.js'

const WIDTHS = [390, 768, 1440]
const THEMES = ['light', 'dark']
const PERCENT = /\d+\s*%/g

const panelOf = (page) => page.locator('.sp-panel-body:has(.sp-modes)')

/** Every % token in the converter panel's visible text. */
const percentTokens = (page) => panelOf(page).evaluate((el) => el.innerText.match(/\d+\s*%/g) || [])

const compressPane = (page) => panelOf(page).locator('.sp-cv-pane.sp-conv.is-on')

/** Wait for the saving line to state a figure, i.e. a conversion has finished. */
const settled = (page) => expect(
  compressPane(page).locator('.sp-saving'),
  'the converter never finished measuring the photograph',
).toHaveText(/^\d+%\s*(smaller|larger)/, { timeout: 15000 })

for (const theme of THEMES) {
  for (const width of WIDTHS) {
    test(`the converter panel shows one percentage, the saving (${theme}, ${width})`, async ({ browser }) => {
      const ctx = await browser.newContext({ viewport: { width, height: 900 }, colorScheme: theme })
      await ctx.addInitScript((t) => {
        try { localStorage.setItem('vs-t', t) } catch { /* private mode */ }
      }, theme)
      const page = await ctx.newPage()
      watch(page, 'a visitor trying the homepage converter')
      await go(page, '/')

      const panel = panelOf(page)
      await panel.locator('.sp-modes').scrollIntoViewIfNeeded()

      // Record the number of % tokens on every change to the panel, so a
      // transient second figure between settled states is caught too.
      await panel.evaluate((el) => {
        window.__pctCounts = []
        const read = () => window.__pctCounts.push((el.innerText.match(/\d+\s*%/g) || []).length)
        new MutationObserver(read).observe(el, { subtree: true, childList: true, characterData: true, attributes: true })
        read()
      })

      // TABS: one Compress, no Convert, 3D model second. Named by aria-label.
      const tabs = await panel.getByRole('tab').evaluateAll((els) => els.map((el) => el.getAttribute('aria-label')))
      expect.soft(tabs, 'the mode tabs are not Compress / 3D model / Video frames / Aspect ratio').toEqual(['Compress', '3D model', 'Video frames', 'Aspect ratio'])
      await expect(panel.getByRole('tab', { name: 'Compress', exact: true })).toHaveAttribute('aria-selected', 'true')

      await settled(page)

      // AFTER LABEL: no figure on it.
      const afterLabel = (await compressPane(page).locator('.sp-bar').nth(1).locator('small').innerText()).trim()
      expect.soft(afterLabel, 'the AFTER label carries something besides the word AFTER').toBe('AFTER')

      // ONE TOKEN, and it is the saving line; the Quality row prints no figure.
      const row = (await compressPane(page).locator('.sp-saving').innerText()).replace(/\s+/g, ' ').trim()
      const tokens = await percentTokens(page)
      expect.soft(tokens, `panel % tokens: ${JSON.stringify(tokens)}`).toHaveLength(1)
      expect.soft(row, 'the saving line is not a figure and its words').toMatch(/^\d+% (smaller|larger)/)
      expect.soft(await compressPane(page).locator('.sp-quality b').count(), 'the Quality row prints a figure').toBe(0)

      // BAR vs LABEL: the AFTER bar is drawn as wide as the file that is left.
      const saved = parseInt(row, 10) * (/larger/.test(row) ? -1 : 1)
      // The fill eases to its width, so read it once it has stopped moving.
      const drawnNow = () => compressPane(page).locator('.sp-bar').nth(1).evaluate((bar) => {
        const fill = bar.querySelector('.sp-bar-fill').getBoundingClientRect().width
        return (fill / bar.querySelector('.sp-bar-track').getBoundingClientRect().width) * 100
      })
      await expect.poll(async () => Math.abs((await drawnNow()) - (100 - saved)), {
        message: `AFTER bar is not drawn as wide as the file that is left (a saving of ${saved}%)`,
        timeout: 3000,
      }).toBeLessThan(2.5)

      // A QUALITY CHANGE: the old figure stays until the new one lands, so the
      // panel still shows exactly one % straight after the change and once settled.
      const slider = compressPane(page).locator('.sp-quality input[type="range"]')
      await slider.focus()
      await page.keyboard.press('ArrowLeft')
      expect.soft(await percentTokens(page), 'a second % appeared straight after a quality change').toHaveLength(1)
      await page.waitForTimeout(700)
      await settled(page)
      expect.soft(await percentTokens(page), 'a second % after a quality change settled').toHaveLength(1)

      // A FORMAT CHANGE.
      await panel.getByRole('button', { name: 'JPEG', exact: true }).click()
      await page.waitForTimeout(700)
      await settled(page)
      expect.soft(await percentTokens(page), 'a second % under JPEG').toHaveLength(1)

      // Lossless: the saving line says no quality is lost, and there is still
      // at most the one figure.
      await panel.getByRole('button', { name: 'PNG', exact: true }).click()
      await page.waitForTimeout(700)
      await settled(page)
      expect.soft((await percentTokens(page)).length, 'more than one % under PNG').toBeLessThanOrEqual(1)
      expect.soft((await compressPane(page).locator('.sp-saving').innerText()).replace(/\s+/g, ' ').trim(), 'the lossless line states more than the saving').toMatch(/^\d+% (smaller, no quality lost|larger than the original)$/)
      await expect(compressPane(page).locator('.sp-quality > span'), 'the lossless row does not say quality is ignored').toHaveText('Lossless, quality ignored')

      // The whole run never showed more than one.
      const counts = await page.evaluate(() => window.__pctCounts)
      expect.soft(Math.max(...counts), `% tokens seen across the run: ${JSON.stringify([...new Set(counts)])}`).toBeLessThanOrEqual(1)
      expect.soft(counts, 'the run never reached a state showing the saving').toContain(1)

      // The other tabs still open their own panes; the rest stay hidden.
      const tab = (name) => panel.getByRole('tab', { name, exact: true })
      const pane = (cls) => panel.locator(`.sp-cv-pane.${cls}`)
      await tab('3D model').click()
      await expect(pane('sp-model'), '3D model no longer opens its stage').toBeVisible()
      await expect(pane('sp-conv')).toBeHidden()
      await tab('Video frames').click()
      await expect(pane('sp-frames'), 'Video frames no longer opens its strip').toBeVisible()
      await expect(pane('sp-model')).toBeHidden()
      await tab('Aspect ratio').click()
      await expect(pane('sp-ratio'), 'Aspect ratio no longer opens its stage').toBeVisible()
      await expect(pane('sp-frames')).toBeHidden()
      await tab('Compress').click()
      await expect(pane('sp-conv'), 'Compress no longer opens the converter').toBeVisible()
      await expect(pane('sp-ratio')).toBeHidden()

      // The page did not grow sideways.
      expect.soft(
        await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth),
        'the converter pushed the page sideways',
      ).toBe(0)

      await ctx.close()
    })
  }
}
