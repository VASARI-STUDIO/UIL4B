// Persona: KNOWLEDGEABLE NEW USER — a designer who knows exactly what answer
// they need and lands straight on a tool. Every test is one concrete goal;
// the pass condition is "the user got their answer", not "the page loaded".
import { test, expect } from './base.js'
import { watch, go } from './helpers.js'

const PERSONA = 'knowledgeable new user'

test.describe('goal-driven flows on the Aspect & Resolution calculator', () => {
  test('“What size is an Instagram portrait post?”', async ({ page }) => {
    watch(page, PERSONA)
    await go(page, '/create/aspect-ratio')
    await page.getByRole('button', { name: 'Social', exact: true }).click()
    await page.getByRole('button', { name: /YouTube video/ }).click()
    await page.getByRole('option', { name: /Instagram post \(portrait\)/ }).click()

    await expect(page.getByRole('button', { name: '1080 W' })).toBeVisible()
    await expect(page.getByRole('button', { name: '1350 H' })).toBeVisible()
    await expect(page.getByRole('button', { name: /Ratio 4:5/ })).toBeVisible()
  })

  test('“What aspect ratio is my 1179×2556 screenshot?”', async ({ page }) => {
    watch(page, PERSONA)
    await go(page, '/create/aspect-ratio')
    await page.getByRole('button', { name: /Width × height/ }).click()
    await page.getByRole('spinbutton', { name: 'Width in pixels' }).fill('1179')
    await page.getByRole('spinbutton', { name: 'Height in pixels' }).fill('2556')
    await expect(page.getByRole('button', { name: /Ratio 131:284/ })).toBeVisible()

    // THE SUGGESTION MOVED OUT OF THE RATIO BUTTON AND BECAME A CONTROL.
    //
    // It used to be a <small> nested inside the Ratio stat, so this assertion
    // read both strings off one accessible name. That button copies, which is
    // why a nested control was impossible and the nearest standard could only
    // ever be read — the founder's report on 2026-09-15 was exactly that: he
    // typed a measured 1280×589, was shown its neighbour, and had no way into
    // it, so the size ladder underneath kept building from the partial ratio.
    //
    // The assertion moves onto the markup that ships and gets stronger with it:
    // the old one proved the text existed, this proves the offer WORKS.
    const snap = page.getByRole('button', { name: /Nearest standard 9:19.5/ })
    await expect(snap).toBeVisible()
    await snap.click()

    // 9:19.5 against the typed width of 1179 is 2554.5, so 2555 — one pixel
    // from the 2556 that was measured. That closeness is the finding, not a
    // rounding detail: the screenshot was already this standard, and the tool
    // could not say so in a way you could act on.
    await expect(page.getByRole('spinbutton', { name: 'Height in pixels' })).toHaveValue('2555')
  })

  test('“What PPI is a 27-inch QHD monitor?”', async ({ page }) => {
    watch(page, PERSONA)
    await go(page, '/create/aspect-ratio')
    await page.getByRole('button', { name: 'Screens', exact: true }).click()
    await page.getByRole('button', { name: /1920 × 1080/ }).first().click()
    await page.getByRole('option', { name: /QHD/ }).first().click()
    await expect(page.getByRole('spinbutton', { name: 'Pixels per inch' })).toHaveValue('109')
  })

  test('“What are the iPhone 16 screen specs?”', async ({ page }) => {
    watch(page, PERSONA)
    await go(page, '/create/aspect-ratio')
    await page.getByRole('button', { name: 'Devices', exact: true }).click()
    await page.getByRole('button', { name: /Pick a device/ }).click()
    await page.getByRole('option', { name: /^iPhone 16/ }).first().click()

    await expect(page.getByRole('button', { name: '1179 W' })).toBeVisible()
    await expect(page.getByRole('button', { name: '2556 H' })).toBeVisible()
    await expect(page.getByRole('spinbutton', { name: 'Pixels per inch' })).toHaveValue('460')
    await expect(page.getByRole('button', { name: /Diagonal ″ 6.1″/ })).toBeVisible()
  })

  test('“Show me standard 4:5 sizes” (ratio-first exploration)', async ({ page }) => {
    watch(page, PERSONA)
    await go(page, '/create/aspect-ratio')
    await page.getByRole('button', { name: 'Ratios', exact: true }).click()
    await page.getByRole('button', { name: /4:5/ }).first().click()
    await page.getByRole('button', { name: /Pick a standard 4:5 size/ }).click()
    await page.getByRole('option', { name: /1080 × 1350/ }).click()
    await expect(page.getByRole('button', { name: '1080 W' })).toBeVisible()
    await expect(page.getByRole('button', { name: '1350 H' })).toBeVisible()
  })
})

test.describe('goal-driven checks on the other live tools', () => {
  const LIVE_TOOLS = [
    // /create/color opens the Palette Generator.
    { url: '/create/color', expectText: /palette|colou?r/i, goal: 'open the colour tool' },
    { url: '/create/icons', expectText: /icon/i, goal: 'open the icon library' },
    { url: '/create/file-converter', expectText: /convert/i, goal: 'open the file converter' },
  ]
  for (const { url, expectText, goal } of LIVE_TOOLS) {
    test(`“I want to ${goal}” — ${url} is alive and on-topic`, async ({ page }) => {
      watch(page, PERSONA)
      await go(page, url)
      await expect(page.locator('body')).toContainText(expectText, { timeout: 15000 })
    })
  }
})
