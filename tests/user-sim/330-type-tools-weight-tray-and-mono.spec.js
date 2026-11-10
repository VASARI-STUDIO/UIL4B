// Two behaviours of the type tools that no other spec drives from the keyboard
// or through the Mono chip.
//
//   1  Font Pair's weight tray works by keyboard: the arrow keys travel the
//      weights, Enter or Space picks one, the specimen's font-weight follows,
//      and the focused weight shows a ring. At 1440 the family cards are in the
//      page; at 390 they are inside the family sheet.
//   2  The Font Gallery's Mono category leaves only monospace faces, marks its
//      chip as pressed, and drops the sans faces. At 390 the categories are in
//      the Filters sheet, where each pill carries its count.
//
// MUTATIONS (each should turn the named tests red):
//   - drop the ArrowLeft/ArrowRight handling in FamilyCard's onTrayKey      -> 1 (arrows)
//   - make a weight pill's click handler not call onWeight                  -> 1 (Enter, Space)
//   - set `.fpr-wopt:focus-visible { outline: none }`                       -> 1 (ring)
//   - make isGalleryListTypeface return true for every font                 -> 2
//   - make the category filter ignore 'monospace'                           -> 2
import { test, expect } from './base.js'
import { go, watch } from './helpers.js'

const WIDTHS = [1440, 390]

// The heading card's weight trigger is opened with the keyboard, so the ring
// below is a real :focus-visible one rather than a programmatic focus.
async function openHeadingTray(page, width) {
  if (width < 768) {
    await page.locator('.fpr-dock .fpr-pill').first().click()
    await expect(page.locator('.fpr-sheet')).toBeVisible()
  }
  const scope = width < 768 ? page.locator('.fpr-sheet') : page.locator('.fpr-fam').first()
  const trigger = scope.getByRole('button', { name: /^Heading weight: \d{3}$/ })
  await trigger.focus()
  await page.keyboard.press('Enter')
  const tray = page.getByRole('listbox', { name: 'Heading weight' })
  await expect(tray).toBeVisible()
  return { scope, trigger, tray }
}

const focusedWeight = (page) => page.evaluate(() => document.activeElement?.getAttribute('data-value') ?? null)
const specimenWeight = (page) => page.locator('.fpr-street-h').first().evaluate((el) => getComputedStyle(el).fontWeight)

for (const width of WIDTHS) {
  test.describe(`Font Pair weight tray by keyboard at ${width}px`, () => {
    test.beforeEach(async ({ page }) => {
      watch(page, `a keyboard user choosing a heading weight at ${width}px`)
      await page.setViewportSize({ width, height: width < 768 ? 844 : 900 })
      await go(page, '/create/font-pair')
      await expect(page.locator(width < 768 ? '.fpr-frow' : '.fpr-fam')).toHaveCount(2)
    })

    test('opening the tray puts focus on the current weight, and the arrow keys move focus one weight at a time', async ({ page }) => {
      const { tray } = await openHeadingTray(page, width)
      await expect(tray.locator('[role="option"][aria-selected="true"]')).toHaveText('800')
      expect(await focusedWeight(page), 'focus starts on the current weight').toBe('800')

      await page.keyboard.press('ArrowLeft')
      expect(await focusedWeight(page), 'ArrowLeft goes to the next lighter weight').toBe('700')
      await page.keyboard.press('ArrowRight')
      await page.keyboard.press('ArrowRight')
      expect(await focusedWeight(page), 'ArrowRight goes to the next heavier weight').toBe('900')
      await page.keyboard.press('Home')
      const first = await focusedWeight(page)
      expect(Number(first), 'Home goes to the lightest weight').toBeLessThan(800)
      // Moving focus alone must not pick: the selection and the specimen stay.
      await expect(tray.locator('[role="option"][aria-selected="true"]')).toHaveText('800')
      expect(await specimenWeight(page)).toBe('800')
    })

    test('the focused weight shows a visible ring', async ({ page }) => {
      await openHeadingTray(page, width)
      await page.keyboard.press('ArrowLeft')
      const ring = await page.evaluate(() => {
        const el = document.activeElement
        const cs = getComputedStyle(el)
        return {
          focusVisible: el.matches(':focus-visible'),
          style: cs.outlineStyle,
          width: parseFloat(cs.outlineWidth),
        }
      })
      expect(ring.focusVisible, 'the focused weight is not :focus-visible after an arrow key').toBe(true)
      expect(ring.style, 'the focused weight has no outline').not.toBe('none')
      expect(ring.width, 'the focus ring is under 2px').toBeGreaterThanOrEqual(2)
    })

    test('Enter picks the focused weight: the trigger and the specimen both change, and focus returns to the trigger', async ({ page }) => {
      const { scope } = await openHeadingTray(page, width)
      await page.keyboard.press('ArrowLeft')
      await page.keyboard.press('Enter')
      await expect(page.getByRole('listbox', { name: 'Heading weight' })).toHaveCount(0)
      await expect(scope.getByRole('button', { name: 'Heading weight: 700' })).toBeVisible()
      await expect.poll(() => specimenWeight(page)).toBe('700')
      await expect(scope.getByRole('button', { name: 'Heading weight: 700' })).toBeFocused()
    })

    test('Space picks the focused weight', async ({ page }) => {
      const { scope } = await openHeadingTray(page, width)
      await page.keyboard.press('ArrowRight')
      await page.keyboard.press('Space')
      await expect(page.getByRole('listbox', { name: 'Heading weight' })).toHaveCount(0)
      await expect(scope.getByRole('button', { name: 'Heading weight: 900' })).toBeVisible()
      await expect.poll(() => specimenWeight(page)).toBe('900')
    })

    test('Escape closes the tray without changing the weight', async ({ page }) => {
      const { scope } = await openHeadingTray(page, width)
      await page.keyboard.press('ArrowLeft')
      await page.keyboard.press('Escape')
      await expect(page.getByRole('listbox', { name: 'Heading weight' })).toHaveCount(0)
      await expect(scope.getByRole('button', { name: 'Heading weight: 800' })).toBeFocused()
      expect(await specimenWeight(page)).toBe('800')
    })
  })
}

// Hand-written catalogue: the monospace faces are named here, so the expected
// set does not come from the filter under test.
const MONO = ['JetBrains Mono', 'Fira Code', 'Space Mono']
const CATALOGUE = {
  fonts: [
    { family: 'Inter', category: 'sans-serif', variants: [400, 700], subsets: ['latin'], popularity: 0 },
    { family: 'JetBrains Mono', category: 'monospace', variants: [400, 700], subsets: ['latin'], popularity: 1 },
    { family: 'Lora', category: 'serif', variants: [400, 700], subsets: ['latin'], popularity: 2 },
    { family: 'Fira Code', category: 'monospace', variants: [400, 700], subsets: ['latin'], popularity: 3 },
    { family: 'Pacifico', category: 'handwriting', variants: [400], subsets: ['latin'], popularity: 4 },
    { family: 'Space Mono', category: 'monospace', variants: [400, 700], subsets: ['latin'], popularity: 5 },
    { family: 'Rubik', category: 'sans-serif', variants: [400, 700], subsets: ['latin'], popularity: 6 },
  ],
}

for (const width of WIDTHS) {
  test(`Font Gallery Mono category leaves only monospace faces at ${width}px`, async ({ page }) => {
    watch(page, `a designer filtering the Font Gallery to monospace at ${width}px`)
    await page.setViewportSize({ width, height: width < 768 ? 844 : 900 })
    await page.route('**/api/fonts', (route) => route.fulfill({ json: CATALOGUE }))
    await go(page, '/create/font-gallery')
    await expect(page.locator('.fg-card')).toHaveCount(CATALOGUE.fonts.length)

    let chip
    if (width < 768) {
      await page.getByRole('button', { name: /^Filters/ }).click()
      const sheet = page.locator('.fg-sheet')
      await expect(sheet).toBeVisible()
      chip = sheet.getByRole('button', { name: /^Mono \d/ })
      await expect(chip, 'the Mono pill carries its family count').toHaveText(/^Mono\s*3$/)
      await chip.click()
      await expect(chip).toHaveAttribute('aria-pressed', 'true')
      await sheet.getByRole('button', { name: /^Show \d+ famil/ }).click()
      await expect(page.locator('.fg-sheet')).toHaveCount(0)
      // The phone's chip row beside Filters shows the same choice.
      await expect(page.locator('.fg-chips').getByRole('button', { name: 'Mono', exact: true })).toHaveAttribute('aria-pressed', 'true')
    } else {
      chip = page.getByRole('group', { name: 'Filter by category' }).getByRole('button', { name: 'Mono', exact: true })
      await chip.click()
      await expect(chip).toHaveAttribute('aria-pressed', 'true')
    }

    await expect(page.locator('.fg-card')).toHaveCount(MONO.length)
    // The names fill in as the cards mount, so read them until they settle.
    const readNames = async () => (await page.locator('.fg-card-name').allTextContents()).map((n) => n.trim()).sort()
    await expect.poll(readNames, { message: 'every listed card is a monospace family, and none is missing' }).toEqual(MONO.slice().sort())
    const names = await readNames()
    expect(names).toContain('JetBrains Mono')
    expect(names, 'a sans face is listed under Mono').not.toContain('Inter')
  })
}
