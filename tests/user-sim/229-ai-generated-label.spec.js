// AI-generated output says so on the page.
//
// Alt Text and the Brand Starter each show the same "AI-generated" label on a
// result the model wrote (src/components/AiLabel.jsx, wording in
// src/config/aiLabel.js). The image prompt generator is hidden while it is
// marked "soon", so its label is pinned in tests/unit/ai-generated-label.test.js
// instead.
//
// The label is on screen only: copied alt text must reach the clipboard exactly
// as written, because it goes into an `alt` attribute.
//
// MUTATION: delete the <AiLabel> from the Alt Text card or from the Brand
// Starter result header and the matching test fails; put the label text into
// copyOne and the clipboard assertion fails.
import { test, expect } from './base.js'
import { go, signIn, watch } from './helpers.js'
import { AI_GENERATED_LABEL } from '../../src/config/aiLabel.js'

const ALT = 'A solid blue rectangle on a plain white page'
const BRIEF = 'A booking app for independent dog groomers. Calm and practical, readable all day.'
const STARTER = {
  name: 'Quiet Schedule',
  rationale: 'A calm working palette that stays readable across a full day of scheduling.',
  palette: [
    { role: 'Background', hex: '#FFFFFF' },
    { role: 'Surface', hex: '#F4F5F7' },
    { role: 'Text', hex: '#14161A' },
    { role: 'Primary', hex: '#1F5F9E' },
    { role: 'Accent', hex: '#C2643B' },
  ],
  fonts: {
    heading: { family: 'Manrope', weight: 700, category: 'sans-serif' },
    body: { family: 'Lora', weight: 400, category: 'serif' },
  },
  typeScale: { base: 17, ratio: 1.25 },
}

/** A 320x200 PNG made in the page: a real image the tool has to decode. */
async function pngBytes(page) {
  const b64 = await page.evaluate(() => {
    const c = document.createElement('canvas'); c.width = 320; c.height = 200
    const x = c.getContext('2d'); x.fillStyle = '#1c40f2'; x.fillRect(0, 0, 320, 200)
    return c.toDataURL('image/png').split(',')[1]
  })
  return Buffer.from(b64, 'base64')
}

for (const width of [390, 1440]) {
  test(`${width}px · Alt Text: a generated description is labelled AI-generated, and copies clean`, async ({ page, context }) => {
    watch(page, `a signed-in user generating alt text on a ${width}px screen`)
    await context.grantPermissions(['clipboard-read', 'clipboard-write']).catch(() => {})
    await page.setViewportSize({ width, height: 844 })
    await signIn(page, { plan: 'free' })
    await page.route('**/api/ai', (route) => route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ altText: ALT }),
    }))
    await go(page, '/create/alt-text')

    await page.locator('.alt-dropzone input[type="file"]')
      .setInputFiles({ name: 'photo.png', mimeType: 'image/png', buffer: await pngBytes(page) })
    const card = page.locator('.alt-card')
    await expect(page.locator('.alt-card-ready')).toHaveCount(1, { timeout: 10000 })
    // Before anything is generated there is nothing to label.
    await expect(card.getByTestId('ai-label')).toHaveCount(0)

    const home = width < 768 ? '[data-tl-dock]' : '[data-tool-toolbar]'
    await page.locator(home).getByRole('button', { name: /^Generate/ }).click()

    const label = card.getByTestId('ai-label')
    await expect(label).toBeVisible({ timeout: 10000 })
    await expect(label).toContainText(AI_GENERATED_LABEL)
    await expect(card.locator('textarea.alt-card-text')).toHaveValue(ALT)

    // The label heads the text: above the box, inside the card.
    const [l, t] = [await label.boundingBox(), await card.locator('textarea.alt-card-text').boundingBox()]
    expect(l.y + l.height, 'the label sits above the alt text').toBeLessThanOrEqual(t.y + 1)

    // No horizontal overflow from the new row at this width.
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
    expect(overflow).toBeLessThanOrEqual(0)

    // Copy puts the description on the clipboard exactly as written.
    await card.getByRole('button', { name: 'Copy', exact: true }).click()
    const copied = await page.evaluate(() => navigator.clipboard.readText()).catch(() => null)
    if (copied !== null) expect(copied).toBe(ALT)
  })

  test(`${width}px · Brand Starter: a generated result is labelled AI-generated`, async ({ page }) => {
    watch(page, `a signed-in user generating a brand starter on a ${width}px screen`)
    await page.setViewportSize({ width, height: 844 })
    await signIn(page, { plan: 'pro' })
    await page.route('**/api/ai', (route) => route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        starter: STARTER,
        provider: 'openrouter',
        generation: { used: 1, limit: 50, remaining: 49, period: 'month' },
      }),
    }))
    await go(page, '/create/auto-builder')

    await expect(page.getByTestId('brand-starter-result')).toHaveCount(0)
    await page.locator('#bs-brief').fill(BRIEF)
    await page.getByTestId('brand-starter-generate').click()

    const result = page.getByTestId('brand-starter-result')
    await expect(result).toBeVisible({ timeout: 10000 })
    const label = result.getByTestId('ai-label')
    await expect(label).toBeVisible()
    await expect(label).toContainText(AI_GENERATED_LABEL)

    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
    expect(overflow).toBeLessThanOrEqual(0)
  })
}
