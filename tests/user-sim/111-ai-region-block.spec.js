// A VISITOR IN THE UK, SWITZERLAND OR THE EEA IS TOLD WHY THE IMAGE TOOL ISN'T
// THERE, INSTEAD OF BEING GIVEN AN UPLOAD BOX THAT CAN ONLY FAIL.
//
// Google's Gemini terms don't let the free tier serve those regions, so
// /api/ai refuses the image tasks with 451 and answers GET /api/ai?region=1
// with { blocked: true }. The page asks that question on load and swaps the
// dropzone for a card that says why. Only an explicit `true` blocks: a 500, a
// network failure or a page that answers with HTML all leave the tool open,
// because locking out everybody on a hiccup is the worse mistake.
//
// The server's answer is stubbed here (a preview build has no /api); what is
// under test is what the page does with each answer. The country list and the
// gate's place in the request are unit-tested in tests/unit/ai-region-block.test.js
// and tests/unit/ai-provider-path.test.js.
//
// MUTATION: make regionFromReply (src/utils/aiRegion.js) return 'blocked' when
// the reply is not ok — the 500 and network-failure specs go red. Stop the page
// swapping the dropzone for the card — the blocked spec goes red.
//
// REGION_SHOTS_DIR=<dir> saves a screenshot of the blocked state at each width
// (and the open state at 1440) into <dir>; unset, no file is written.
import path from 'node:path'
import { test, expect } from './base.js'
import { go, signIn, watch } from './helpers.js'

const BRIEF = 'A booking app for independent dog groomers. Calm and practical, readable all day.'
const REFUSAL = {
  error: "This tool isn't available in your region. Nothing was taken from your allowance.",
  code: 'region-unavailable',
  quotaSpent: false,
}

const isRegionCheck = (u) => u.pathname === '/api/ai' && u.searchParams.has('region')
const isAiPost = (u) => u.pathname === '/api/ai' && !u.searchParams.has('region')

/** Answer the region question. Returns the list of times it was asked. */
async function stubRegion(page, answer) {
  const asked = []
  await page.route(isRegionCheck, (route) => {
    asked.push(route.request().url())
    if (answer === 'network-failure') return route.abort('failed')
    if (answer === 'html') return route.fulfill({ status: 200, contentType: 'text/html', body: '<!doctype html><title>x</title>' })
    return route.fulfill({ status: answer.status ?? 200, contentType: 'application/json', body: JSON.stringify(answer.body) })
  })
  return asked
}

/** Wait until the page has asked AND had its answer, then let React render it,
 *  so "nothing changed" is a statement about the settled page, not the first
 *  frame. */
async function settled(page, asked) {
  await expect.poll(() => asked.length, { message: 'the page never asked whether this region is blocked' }).toBeGreaterThan(0)
  await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(r, 50)))))
}

async function shot(page, name) {
  const dir = process.env.REGION_SHOTS_DIR
  if (dir) await page.screenshot({ path: path.join(dir, name) })
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

const BLOCKED = { body: { blocked: true } }

for (const width of [390, 768, 1440]) {
  test(`${width}px · Alt Text: a blocked region sees why, with no upload box and no Generate`, async ({ page }) => {
    watch(page, `a visitor in a Gemini-excluded region on a ${width}px screen`)
    await page.setViewportSize({ width, height: 900 })
    const asked = await stubRegion(page, BLOCKED)
    await go(page, '/create/alt-text')

    const card = page.getByTestId('ai-region-blocked')
    await expect(card).toBeVisible()
    await expect(card.getByRole('heading', { name: 'Not available in your region' })).toBeVisible()
    await expect(card).toContainText('Google Gemini')
    await expect(card).toContainText('European Economic Area')
    await settled(page, asked)

    // Nothing is left that can only fail: no dropzone, no file input anywhere,
    // no Generate button, no line saying the image goes to Gemini.
    await expect(page.locator('.alt-dropzone')).toHaveCount(0)
    await expect(page.locator('input[type="file"]')).toHaveCount(0)
    await expect(page.locator('[data-tool-toolbar]').getByRole('button', { name: /^Generate/ })).toHaveCount(0)
    await expect(page.locator('#alt-ai-consent')).toHaveCount(0)

    // The guide on writing it by hand is still there, and so is the explanation
    // in the side panel.
    await expect(page.getByRole('heading', { name: 'What good alt text looks like' })).toBeVisible()
    await expect(page.getByText('Every other UIL4B tool works as normal where you are.')).toBeVisible()

    // The card sits inside the screen.
    const box = await card.boundingBox()
    expect(box.x, 'the card starts off the left edge').toBeGreaterThanOrEqual(0)
    expect(box.x + box.width, 'the card runs off the right edge').toBeLessThanOrEqual(width + 1)
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
    expect(overflow, 'the page scrolls sideways').toBeLessThanOrEqual(0)

    await shot(page, `alt-text-region-${width}.png`)
  })
}

const OPEN_ANSWERS = [
  ['the server says blocked:false', { body: { blocked: false } }],
  ['the check fails with a 500', { status: 500, body: { error: 'boom' } }],
  ['the check fails with a 500 that still says blocked:true', { status: 500, body: { blocked: true } }],
  ['the check answers with a page, not JSON', 'html'],
  ['the check never reaches the server', 'network-failure'],
]

for (const [what, answer] of OPEN_ANSWERS) {
  test(`1440px · Alt Text stays open when ${what}`, async ({ page }) => {
    watch(page, `a visitor whose region check is: ${what}`)
    await page.setViewportSize({ width: 1440, height: 900 })
    const asked = await stubRegion(page, answer)
    await go(page, '/create/alt-text')
    await settled(page, asked)

    await expect(page.locator('.alt-dropzone')).toBeVisible()
    await expect(page.locator('input[type="file"]')).toHaveCount(1)
    await expect(page.getByTestId('ai-region-blocked')).toHaveCount(0)
    await expect(page.locator('[data-tool-toolbar]').getByRole('button', { name: /^Generate/ })).toBeVisible()
    await expect(page.locator('#alt-ai-consent')).toBeVisible()

    if (what === 'the server says blocked:false') await shot(page, 'alt-text-open-1440.png')
  })
}

test('1440px · Brand Starter is still usable from a blocked region, because its text can be served elsewhere', async ({ page }) => {
  watch(page, 'a visitor in a Gemini-excluded region writing a Brand Starter brief')
  await page.setViewportSize({ width: 1440, height: 900 })
  await stubRegion(page, BLOCKED)
  await go(page, '/create/auto-builder')

  await expect(page.getByRole('heading', { level: 1, name: 'Brand Starter' })).toBeAttached()
  await expect(page.getByTestId('ai-region-blocked')).toHaveCount(0)
  const generate = page.getByTestId('brand-starter-generate')
  await expect(generate).toBeDisabled()
  await page.locator('#bs-brief').fill(BRIEF)
  await expect(page.locator('#bs-brief')).toHaveValue(BRIEF)
  await expect(generate).toBeEnabled()
})

test('1440px · Alt Text: a signed-in visitor the server refuses with 451 is shown the card, and nothing is counted', async ({ page }) => {
  watch(page, 'a signed-in visitor whose region is only found out when Generate is pressed')
  await page.setViewportSize({ width: 1440, height: 900 })
  await signIn(page, { plan: 'free' })
  const asked = await stubRegion(page, { body: { blocked: false } })
  const posts = []
  await page.route(isAiPost, (route) => {
    posts.push(route.request().postDataJSON()?.task)
    return route.fulfill({ status: 451, contentType: 'application/json', body: JSON.stringify(REFUSAL) })
  })
  await go(page, '/create/alt-text')
  await settled(page, asked)
  await expect(page.locator('.alt-dropzone')).toBeVisible()

  // Two images: the first refusal is final for the second too.
  const png = await pngBytes(page)
  await page.locator('.alt-dropzone input[type="file"]').setInputFiles([
    { name: 'one.png', mimeType: 'image/png', buffer: png },
    { name: 'two.png', mimeType: 'image/png', buffer: png },
  ])
  await expect(page.locator('.alt-card-ready')).toHaveCount(2, { timeout: 10000 })
  await page.locator('[data-tool-toolbar]').getByRole('button', { name: /^Generate/ }).click()

  const card = page.getByTestId('ai-region-blocked')
  await expect(card).toBeVisible()
  await expect(card.getByRole('heading', { name: 'Not available in your region' })).toBeVisible()
  await expect(page.locator('.alt-dropzone')).toHaveCount(0)
  await expect(page.locator('[data-tool-toolbar]').getByRole('button', { name: /^Generate/ })).toHaveCount(0)

  // One request, not two. generateAll waits 4.5 s between images, so a second
  // request would arrive after that; wait past it. The sleep is the thing
  // being watched for (a timer), not a stand-in for a condition.
  await page.waitForTimeout(5200)
  // ...and the browser did not count an allowance the server says it never took.
  expect(posts, 'the second image was sent after the region was refused').toEqual(['alt-text'])
  const spent = await page.evaluate(() => Object.entries(localStorage)
    .filter(([k]) => k.startsWith('vs-usage-alt-text'))
    .map(([, v]) => Number(v)))
  expect(spent.every((n) => !n), `a refused request was counted against the allowance: ${spent}`).toBe(true)
})
