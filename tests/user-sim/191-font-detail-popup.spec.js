// The Font Gallery family pop-up (src/components/FontDetailDialog.jsx): one
// scroll of sections under a plain hero, the actions pinned in one row at the
// foot, and a licence block that ends the About section.
//
// MUTATIONS (each should turn exactly one test red):
//   licence text   in LICENCES['OFL-1.1'] (src/utils/fontDossier.js) change the
//                  heading or the summary line; or put the words "Open source"
//                  into the pop-up (a row in fontFacts, or the summary)
//   licence link   drop `target="_blank"` or `rel` from the link in
//                  FontLicenceBlock (src/components/FontDossier.jsx)
//   licence block  stop rendering <FontLicenceBlock> in FontAboutPanel, or put
//                  the Licence row back into fontFacts
//   bar, one row   `flex-wrap: wrap` on `.fgd-bar-row` with `min-width: 40%` on
//                  `.fgd-bar-row > *`; or render View on Google Fonts on the
//                  bar at 768 and 390 as well
//   More menu      empty `moreItems` in FontDetailDialog.jsx, or drop the
//                  'Build a type scale' entry from the phone list
//   close + focus  remove the `useModalDialog` focus restore (pass no `onClose`
//                  focus target), or make the More menu's Escape handler also
//                  close the dialog
//   reduced motion delete the two `.fgd { animation: fg-fade ... }` rules under
//                  `html[data-reduced-motion="true"]` and
//                  `prefers-reduced-motion` in src/styles/pages/font-detail.css
import { test, expect } from './base.js'
import { go, watch } from './helpers.js'

const CATALOGUE = {
  fonts: [
    { family: 'Lora', category: 'serif', variants: [400, 500, 600, 700], subsets: ['latin'], popularity: 0 },
    { family: 'Inter', category: 'sans-serif', variants: [100, 200, 300, 400, 500, 600, 700, 800, 900], subsets: ['latin'], popularity: 1 },
    { family: 'Merriweather', category: 'serif', variants: [300, 400, 700, 900], subsets: ['latin'], popularity: 2 },
  ],
}

// The OFL summary line, character for character (the apostrophe is a curly one).
const OFL_HEADING = 'SIL Open Font License 1.1'
const OFL_LINE = 'Free to use in personal and commercial work, including apps and logos. You can’t sell the font files on their own.'

const WIDTHS = [1440, 768, 390]

async function openPopup(page, width, family = 'Inter') {
  await page.setViewportSize({ width, height: 900 })
  await page.route('**/api/fonts', (route) => route.fulfill({ json: CATALOGUE }))
  await go(page, '/create/font-gallery')
  await expect(page.locator('.fg-card').first()).toBeVisible()
  await page.getByLabel('Search font families').fill(family)
  await expect(page.locator('.fg-card')).toHaveCount(1)
  const opener = page.locator('.fg-card-open').first()
  await opener.click()
  const dialog = page.getByRole('dialog', { name: family })
  await expect(dialog).toBeVisible()
  return { dialog, opener }
}

test.describe('Font Gallery pop-up: licence', () => {
  test('criterion 14: Inter names the SIL Open Font License 1.1 and says what it allows', async ({ page }) => {
    watch(page, 'designer checking whether they can ship Inter')
    const { dialog } = await openPopup(page, 1440)

    const about = dialog.locator('#fgd-about')
    await about.scrollIntoViewIfNeeded()
    const licence = about.locator('section.fdx-licence')
    await expect(licence).toHaveCount(1)
    await expect(licence.getByRole('heading', { level: 4 })).toHaveText(OFL_HEADING)
    await expect(licence.locator('p')).toHaveText(OFL_LINE)

    // The block sits under the facts grid, and the grid no longer carries a
    // Licence row of its own: the licence is named once.
    await expect(about.locator('.fdx-facts')).not.toContainText(/licen[cs]e/i)
    const facts = await about.locator('.fdx-facts').boundingBox()
    const block = await licence.boundingBox()
    expect(block.y, 'the licence block sits below the facts').toBeGreaterThan(facts.y + facts.height - 1)
  })

  test('criterion 14: nothing in the pop-up says "Open source"', async ({ page }) => {
    watch(page, 'designer reading every line of the pop-up')
    const { dialog } = await openPopup(page, 1440)
    // Wait for the licence block, so the text read is the finished pop-up.
    await expect(dialog.locator('section.fdx-licence')).toHaveCount(1)
    // innerText is what is rendered; textContent adds what is only for screen
    // readers or hidden, so both are read.
    expect(await dialog.evaluate((el) => el.innerText)).not.toMatch(/open[\s-]*source/i)
    expect(await dialog.evaluate((el) => el.textContent)).not.toMatch(/open[\s-]*source/i)
  })

  test('criterion 14: the licence link opens a new tab and cannot reach back to the page', async ({ page, context }) => {
    watch(page, 'designer following the licence link')
    await context.route('https://openfontlicense.org/**', (route) => route.fulfill({ contentType: 'text/html', body: '<title>licence</title>' }))
    const { dialog } = await openPopup(page, 1440)

    const link = dialog.locator('section.fdx-licence').getByRole('link', { name: /Read the licence/ })
    await link.scrollIntoViewIfNeeded()
    await expect(link).toHaveAttribute('href', 'https://openfontlicense.org')
    await expect(link).toHaveAttribute('target', '_blank')
    await expect(link).toHaveAttribute('rel', /\bnoopener\b/)
    await expect(link.locator('.sr-only')).toHaveText('(opens in a new tab)')

    // Driven, not only read: a real click opens a second tab and leaves this
    // one on the gallery with the pop-up still open.
    const [popup] = await Promise.all([context.waitForEvent('page'), link.click()])
    expect(popup.url()).toMatch(/^https:\/\/openfontlicense\.org\/?$/)
    expect(await popup.evaluate(() => window.opener), 'the new tab can reach the page that opened it').toBeNull()
    await popup.close()
    expect(new URL(page.url()).pathname).toBe('/create/font-gallery')
    await expect(dialog).toBeVisible()
  })

  test('criterion 14: the Font Pair browser shows the same licence block in its About tab', async ({ page }) => {
    watch(page, 'designer inspecting Inter from the picker')
    await page.route('**/api/fonts', (route) => route.fulfill({ json: CATALOGUE }))
    await go(page, '/create/font-pair')
    await page.getByRole('button', { name: 'Browse heading family' }).first().click()
    const dialog = page.locator('.fbd-dialog')
    await expect(dialog).toBeVisible()
    await dialog.getByLabel('Search font families').fill('Inter')
    await dialog.getByRole('button', { name: /^About Inter/ }).first().click()
    await dialog.getByRole('tab', { name: 'About' }).click()

    const licence = dialog.locator('section.fdx-licence')
    await expect(licence.getByRole('heading', { level: 4 })).toHaveText(OFL_HEADING)
    await expect(licence.locator('p')).toHaveText(OFL_LINE)
    await expect(licence.getByRole('link', { name: /Read the licence/ })).toHaveAttribute('target', '_blank')
  })
})

test.describe('Font Gallery pop-up: the action bar', () => {
  // The bar is the group labelled "Actions for <family>".
  const barOf = (dialog) => dialog.getByRole('group', { name: 'Actions for Inter' })

  for (const width of WIDTHS) {
    test(`the bar is one row with nothing cut off at ${width}`, async ({ page }) => {
      watch(page, 'designer reaching for an action')
      const { dialog } = await openPopup(page, width)
      const bar = barOf(dialog)
      await expect(bar).toBeVisible()

      const report = await bar.evaluate((row) => {
        const shell = row.closest('.fgd').getBoundingClientRect()
        const rowBox = row.getBoundingClientRect()
        const kids = [...row.querySelectorAll('a, button')].filter((k) => k.getBoundingClientRect().height > 0)
        const mids = kids.map((k) => { const r = k.getBoundingClientRect(); return r.top + r.height / 2 })
        return {
          count: kids.length,
          spread: Math.max(...mids) - Math.min(...mids),
          scrollX: row.scrollWidth - row.clientWidth,
          scrollY: row.scrollHeight - row.clientHeight,
          leftOut: kids.filter((k) => k.getBoundingClientRect().left < rowBox.left - 1).length,
          rightOut: kids.filter((k) => k.getBoundingClientRect().right > rowBox.right + 1).length,
          rowInShell: rowBox.left >= shell.left - 1 && rowBox.right <= shell.right + 1,
          pageX: document.documentElement.scrollWidth - window.innerWidth,
          names: kids.map((k) => k.getAttribute('aria-label') || k.textContent.replace(/\s+/g, ' ').trim()),
        }
      })
      expect(report.count, `${width}px: the bar has no actions, so the check proves nothing`).toBeGreaterThanOrEqual(3)
      expect(report.spread, `${width}px: the bar wraps onto a second row (${report.names})`).toBeLessThanOrEqual(2)
      expect(report.scrollX, `${width}px: the bar scrolls sideways`).toBeLessThanOrEqual(0)
      expect(report.scrollY, `${width}px: the bar is taller than one row`).toBeLessThanOrEqual(1)
      expect(report.leftOut + report.rightOut, `${width}px: an action sticks out of the bar`).toBe(0)
      expect(report.rowInShell, `${width}px: the bar runs outside the pop-up`).toBe(true)
      expect(report.pageX, `${width}px: the page scrolls sideways`).toBeLessThanOrEqual(0)
    })
  }

  test('at 1440 the bar holds five actions and no More', async ({ page }) => {
    watch(page, 'designer on a wide screen')
    const { dialog } = await openPopup(page, 1440)
    const bar = barOf(dialog)
    await expect(bar.getByRole('button', { name: 'Find a pairing' })).toBeVisible()
    await expect(bar.getByRole('button', { name: 'Build a type scale' })).toBeVisible()
    // One name in every state; aria-pressed carries which.
    await expect(bar.getByRole('button', { name: 'Compare', exact: true })).toHaveAttribute('aria-pressed', 'false')
    await expect(bar.getByRole('button', { name: 'Copy import URL' })).toBeVisible()
    const google = bar.getByRole('link', { name: /View on Google Fonts/ })
    await expect(google).toHaveAttribute('href', 'https://fonts.google.com/specimen/Inter')
    await expect(google).toHaveAttribute('target', '_blank')
    await expect(google).toHaveAttribute('rel', /\bnoopener\b/)
    await expect(bar.getByRole('button', { name: /^More/ })).toHaveCount(0)
    await expect(bar.locator('a, button')).toHaveCount(5)
  })

  test('at 768 Copy import URL and View on Google Fonts live in More', async ({ page }) => {
    watch(page, 'designer on a tablet')
    const { dialog } = await openPopup(page, 768)
    const bar = barOf(dialog)
    await expect(bar.getByRole('button', { name: 'Find a pairing' })).toBeVisible()
    await expect(bar.getByRole('button', { name: 'Build a type scale' })).toBeVisible()
    await expect(bar.getByRole('button', { name: 'Compare', exact: true })).toBeVisible()
    await expect(bar.getByRole('button', { name: 'Copy import URL' })).toHaveCount(0)
    await expect(bar.getByRole('link', { name: /View on Google Fonts/ })).toHaveCount(0)

    const more = bar.getByRole('button', { name: /^More/ })
    await expect(more).toHaveAttribute('aria-haspopup', 'menu')
    await expect(more).toHaveAttribute('aria-expanded', 'false')
    await more.click()
    await expect(more).toHaveAttribute('aria-expanded', 'true')
    const items = page.getByRole('menuitem')
    await expect(items).toHaveText([/^Copy import URL$/, /^View on Google Fonts/])
    await expect(items.nth(1)).toHaveAttribute('href', 'https://fonts.google.com/specimen/Inter')
    await expect(items.nth(1)).toHaveAttribute('target', '_blank')
  })

  test('at 390 the bar keeps Find a pairing and the compare toggle, and More holds the rest', async ({ page }) => {
    watch(page, 'designer on a phone')
    const { dialog } = await openPopup(page, 390)
    const bar = barOf(dialog)
    await expect(bar.getByRole('button', { name: 'Find a pairing' })).toBeVisible()
    await expect(bar.getByRole('button', { name: 'Compare Inter', exact: true })).toHaveAttribute('aria-pressed', 'false')
    await expect(bar.getByRole('button', { name: 'Build a type scale' })).toHaveCount(0)
    await expect(bar.getByRole('button', { name: 'Copy import URL' })).toHaveCount(0)
    await expect(bar.locator('a, button')).toHaveCount(3)

    const more = bar.getByRole('button', { name: 'More actions for Inter' })
    await more.click()
    await expect(page.getByRole('menuitem')).toHaveText([
      /^Build a type scale$/, /^Copy import URL$/, /^View on Google Fonts/,
    ])
  })

  test('the compare toggle adds Inter to the tray, and reopening shows it pressed', async ({ page }) => {
    watch(page, 'designer adding Inter to a comparison')
    const { dialog } = await openPopup(page, 1440)
    const toggle = barOf(dialog).getByRole('button', { name: 'Compare', exact: true })
    await expect(toggle).toHaveAttribute('aria-pressed', 'false')
    // Choosing to compare closes the pop-up and puts the family in the tray.
    await toggle.click()
    await expect(page.getByRole('dialog')).toHaveCount(0)
    await expect(page.locator('.fg-compare-tray')).toContainText('Inter')

    await page.locator('.fg-card-open').first().focus()
    await page.keyboard.press('Enter')
    const again = page.getByRole('dialog', { name: 'Inter' })
    await expect(again.getByRole('group', { name: 'Actions for Inter' }).getByRole('button', { name: 'Compare', exact: true }))
      .toHaveAttribute('aria-pressed', 'true')
  })

  test('Escape closes the More menu first, then the pop-up', async ({ page }) => {
    watch(page, 'keyboard-only visitor in the More menu')
    const { dialog, opener } = await openPopup(page, 768)
    const more = barOf(dialog).getByRole('button', { name: /^More/ })
    await more.focus()
    await page.keyboard.press('Enter')
    await expect(page.getByRole('menuitem').first()).toBeFocused()
    await page.keyboard.press('ArrowDown')
    await expect(page.getByRole('menuitem').nth(1)).toBeFocused()
    await page.keyboard.press('ArrowDown')
    await expect(page.getByRole('menuitem').first()).toBeFocused()

    await page.keyboard.press('Escape')
    await expect(page.getByRole('menuitem')).toHaveCount(0)
    await expect(dialog, 'the first Escape closed the pop-up as well as the menu').toBeVisible()
    await expect(more).toBeFocused()

    await page.keyboard.press('Escape')
    await expect(page.getByRole('dialog')).toHaveCount(0)
    await expect(opener).toBeFocused()
  })
})

test.describe('Font Gallery pop-up: closing', () => {
  for (const width of WIDTHS) {
    test(`Escape closes it at ${width} and focus returns to the card`, async ({ page }) => {
      watch(page, 'keyboard-only visitor')
      const { dialog, opener } = await openPopup(page, width)
      await expect(dialog).toHaveAttribute('aria-modal', 'true')
      await page.keyboard.press('Escape')
      await expect(page.getByRole('dialog')).toHaveCount(0)
      await expect(opener, 'focus did not return to the card that opened the pop-up').toBeFocused()
      await expect.poll(() => page.evaluate(() => document.documentElement.style.overflow + document.body.style.overflow)).toBe('')
    })
  }

  test('the Close button closes it and hands focus back too', async ({ page }) => {
    watch(page, 'pointer visitor')
    const { dialog, opener } = await openPopup(page, 1440)
    await dialog.getByRole('button', { name: 'Close the Inter specimen' }).click()
    await expect(page.getByRole('dialog')).toHaveCount(0)
    await expect(opener).toBeFocused()
  })

  test('a press on the scrim closes it, but a drag that starts inside and ends on the scrim does not', async ({ page }) => {
    watch(page, 'visitor selecting text in the preview field')
    const { dialog } = await openPopup(page, 1440)
    const box = await dialog.boundingBox()
    const inside = { x: box.x + box.width / 2, y: box.y + 40 }
    const scrim = { x: Math.max(4, box.x / 2), y: box.y + box.height / 2 }
    await page.mouse.move(inside.x, inside.y)
    await page.mouse.down()
    await page.mouse.move(scrim.x, scrim.y, { steps: 5 })
    await page.mouse.up()
    await expect(dialog, 'a selection drag that ended on the scrim closed the pop-up').toBeVisible()

    await page.mouse.click(scrim.x, scrim.y)
    await expect(page.getByRole('dialog')).toHaveCount(0)
  })

  test('the back gesture closes the pop-up and stays on the gallery', async ({ page }) => {
    watch(page, 'phone visitor using the back gesture')
    const { dialog } = await openPopup(page, 390)
    await page.goBack()
    await expect(page.getByRole('dialog')).toHaveCount(0)
    expect(new URL(page.url()).pathname).toBe('/create/font-gallery')
    await expect(page.locator('.fg-card').first()).toBeVisible()
    await expect(dialog).toHaveCount(0)
  })

  test('closing with Escape takes the pop-up’s history entry back off', async ({ page }) => {
    watch(page, 'visitor who opened and closed a pop-up')
    await openPopup(page, 1440)
    await page.keyboard.press('Escape')
    await expect(page.getByRole('dialog')).toHaveCount(0)
    await expect.poll(() => page.evaluate(() => Boolean(window.history.state?.fgd)),
      { message: 'the closed pop-up left its history entry behind, so Back would do nothing visible' }).toBe(false)
  })

  test('a family chosen for comparison hands focus back to the page, not to nothing', async ({ page }) => {
    watch(page, 'keyboard visitor adding a family to compare')
    const { dialog } = await openPopup(page, 1440)
    await dialog.getByRole('button', { name: 'Compare', exact: true }).click()
    await expect(page.getByRole('dialog')).toHaveCount(0)
    await expect.poll(() => page.evaluate(() => document.activeElement === document.body),
      { message: 'focus fell to <body> after the pop-up closed from Compare' }).toBe(false)
  })
})

test.describe('Font Gallery pop-up: the phone More sheet', () => {
  test('More opens a sheet over a scrim; a press on the scrim closes it and returns focus to More', async ({ page }) => {
    watch(page, 'phone visitor opening More')
    const { dialog } = await openPopup(page, 390)
    const more = dialog.getByRole('button', { name: 'More actions for Inter' })
    await more.click()
    await expect(page.getByRole('menuitem')).toHaveCount(3)
    const scrim = page.locator('.fgd-menu-scrim')
    await expect(scrim).toBeVisible()
    await scrim.click({ position: { x: 20, y: 20 } })
    await expect(page.getByRole('menuitem')).toHaveCount(0)
    await expect(dialog, 'the press went through to the pop-up').toBeVisible()
    await expect(more).toBeFocused()
  })
})

test.describe('Font Gallery pop-up: motion', () => {
  // Records, in the same task the pop-up is added to the page and before its
  // first frame, which animations it was given and what its transform is. A
  // sample taken from the test after the click could land after a short
  // animation had already ended.
  const watchOpening = (page) => page.evaluate(() => {
    window.__fgdOpening = null
    new MutationObserver((_records, observer) => {
      const el = document.querySelector('.fgd')
      if (!el) return
      window.__fgdOpening = {
        names: el.getAnimations().map((a) => a.animationName),
        props: el.getAnimations().flatMap((a) => a.effect.getKeyframes().flatMap((k) => Object.keys(k))),
        transform: getComputedStyle(el).transform,
        attr: document.documentElement.getAttribute('data-reduced-motion') + '|' + matchMedia('(prefers-reduced-motion: reduce)').matches + '|' + getComputedStyle(el).animationName,
      }
      observer.disconnect()
    }).observe(document.body, { childList: true, subtree: true })
  })

  // The preference is emulated before the page loads: the app reads it once at
  // start-up into html[data-reduced-motion].
  const openingOf = async (page, width, reducedMotion) => {
    await page.emulateMedia({ reducedMotion })
    await page.setViewportSize({ width, height: 900 })
    await page.route('**/api/fonts', (route) => route.fulfill({ json: CATALOGUE }))
    await go(page, '/create/font-gallery')
    await expect(page.locator('.fg-card').first()).toBeVisible()
    await page.getByLabel('Search font families').fill('Inter')
    await expect(page.locator('.fg-card')).toHaveCount(1)
    await watchOpening(page)
    await page.locator('.fg-card-open').first().click()
    await expect(page.getByRole('dialog', { name: 'Inter' })).toBeVisible()
    await expect.poll(() => page.evaluate(() => window.__fgdOpening)).not.toBeNull()
    return page.evaluate(() => window.__fgdOpening)
  }

  const IDENTITY = /^(none|matrix\(1, 0, 0, 1, 0, 0\))$/

  test.describe('with reduced motion on', () => {
    for (const width of WIDTHS) {
      test(`at ${width} the pop-up opens without moving`, async ({ page }) => {
        watch(page, 'visitor who asked the system for less motion')
        const opening = await openingOf(page, width, 'reduce')
        expect(opening.transform, `the pop-up starts displaced (${opening.names} ${opening.attr})`).toMatch(IDENTITY)
        expect(opening.props, `the opening animation moves it (${opening.names})`).not.toContain('transform')
        expect(opening.props).not.toContain('translate')
        expect(opening.names, 'a fade is allowed, a slide is not').not.toContain('fgd-sheet-in')
        expect(opening.names).not.toContain('fgd-in')
      })
    }
  })

  // The control for the test above: with motion allowed the same sampler sees
  // the slide. Without it, "no transform" could just be a sampler that sees
  // nothing.
  test.describe('with motion allowed', () => {
    for (const { width, name } of [{ width: 390, name: 'fgd-sheet-in' }, { width: 1440, name: 'fgd-in' }]) {
      test(`at ${width} the pop-up slides in as ${name}`, async ({ page }) => {
        watch(page, 'visitor with motion on')
        const opening = await openingOf(page, width, 'no-preference')
        expect(opening.names).toContain(name)
        expect(opening.props).toContain('transform')
      })
    }
  })
})
