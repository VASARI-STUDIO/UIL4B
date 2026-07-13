// Persona: KNOWLEDGEABLE NEW USER — a designer who knows exactly what answer
// they need and lands straight on a tool. Every test is one concrete goal;
// the pass condition is "the user got their answer", not "the page loaded".
import { test, expect } from '@playwright/test'
import { watch, go } from './helpers.js'

const PERSONA = 'knowledgeable new user'

test.describe('goal-driven flows on the Aspect & Resolution calculator', () => {
  test('“What size is an Instagram portrait post?”', async ({ page }) => {
    watch(page, PERSONA)
    await go(page, '/ratio')
    await page.getByRole('tab', { name: 'Social' }).or(page.locator('.rc-tab', { hasText: 'Social' })).first().click()
    await page.locator('.arc-select-btn').first().click()
    await page.locator('.arc-opt', { hasText: 'Instagram post (portrait)' }).click()

    await expect(page.locator('.rc-result')).toContainText('1080')
    await expect(page.locator('.rc-result')).toContainText('1350')
    await expect(page.locator('.arc-stat', { hasText: 'Ratio' })).toContainText('4:5')
  })

  test('“What aspect ratio is my 1179×2556 screenshot?”', async ({ page }) => {
    watch(page, PERSONA)
    await go(page, '/ratio')
    const reverse = page.locator('.rc-reverse')
    await reverse.locator('input').nth(0).fill('1179')
    await reverse.locator('input').nth(1).fill('2556')
    await expect(page.locator('.arc-near')).toContainText('9:19.5')
  })

  test('“What PPI is a 27-inch QHD monitor?”', async ({ page }) => {
    watch(page, PERSONA)
    await go(page, '/ratio')
    await page.locator('.rc-tab', { hasText: 'Screens' }).click()
    await page.locator('.arc-select-btn').first().click()
    await page.locator('.arc-opt', { hasText: 'QHD' }).first().click()
    await expect(page.locator('input[placeholder="PPI"]')).toHaveValue('109')
  })

  test('“What are the iPhone 16 screen specs?”', async ({ page }) => {
    watch(page, PERSONA)
    await go(page, '/ratio')
    await page.locator('.arc-select-btn').first().click()
    await page.locator('.arc-opt', { hasText: /^iPhone 16/ }).first().click()

    await expect(page.locator('.rc-result')).toContainText('1179')
    await expect(page.locator('.rc-result')).toContainText('2556')
    await expect(page.locator('input[placeholder="PPI"]')).toHaveValue('460')
    await expect(page.locator('.arc-stat', { hasText: 'Diagonal ″' })).toContainText('6.1')
  })

  test('“Show me standard 4:5 sizes” (ratio-first exploration)', async ({ page }) => {
    watch(page, PERSONA)
    await go(page, '/ratio')
    await page.locator('.rc-tab', { hasText: 'Ratios' }).click()
    await page.locator('.arc-ratio-card', { hasText: '4:5' }).first().click()
    await page.locator('.arc-select-btn', { hasText: /standard 4:5/i }).click()
    await page.locator('.arc-opt', { hasText: '1080 × 1350' }).click()
    await expect(page.locator('.rc-result')).toContainText('1080')
    await expect(page.locator('.rc-result')).toContainText('1350')
  })
})

test.describe('goal-driven checks on the other live tools', () => {
  const LIVE_TOOLS = [
    { url: '/color', expectText: /colou?r/i, goal: 'open the colour tool' },
    { url: '/icons', expectText: /icon/i, goal: 'open the icon library' },
    { url: '/file-converter', expectText: /convert/i, goal: 'open the file converter' },
  ]
  for (const { url, expectText, goal } of LIVE_TOOLS) {
    test(`“I want to ${goal}” — ${url} is alive and on-topic`, async ({ page }) => {
      watch(page, PERSONA)
      await go(page, url)
      await expect(page.locator('body')).toContainText(expectText, { timeout: 15000 })
    })
  }
})
