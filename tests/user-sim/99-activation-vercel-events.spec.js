// The activation funnel reaches Vercel Web Analytics for a SIGNED-OUT visitor
// (src/utils/productEvents.js). The Firestore counters only ever saw accounts.
//
// Read off window.vaq, the queue <Analytics /> installs: in a local build the
// Vercel script never loads, so every track() call stays in the queue where
// this can see its name and properties.
//
// Not rendered here: sign_up (needs a real new-account event) and
// checkout_started (needs Stripe's embedded checkout). Both are held to their
// call sites by tests/unit/product-events.test.js.
import { test, expect } from './base.js'
import { go } from './helpers.js'

const events = (page) => page.evaluate(() => (window.vaq || [])
  .filter((q) => q[0] === 'event')
  .map((q) => ({ name: q[1].name, data: q[1].data || null })))

const named = async (page, name) => (await events(page)).filter((e) => e.name === name)

test('a signed-out visitor: first tool use and first export, once each', async ({ page }) => {
  await page.context().grantPermissions(['clipboard-read', 'clipboard-write'])
  await go(page, '/create/gradient')
  expect(await named(page, 'first_tool_used'), 'arriving is not using').toEqual([])

  // The toolbar primary, labelled "Copy <format>".
  const copy = page.locator('[data-tool-toolbar] .tl-primary button')
  await expect(copy).toBeVisible()
  await copy.click()
  await expect.poll(() => page.evaluate(() => navigator.clipboard.readText())).toMatch(/gradient/i)

  await expect.poll(() => named(page, 'first_tool_used')).toEqual([{ name: 'first_tool_used', data: { tool: 'gradient' } }])
  await expect.poll(() => named(page, 'first_copy_export')).toEqual([{ name: 'first_copy_export', data: { tool: 'gradient' } }])

  await copy.click()
  await page.waitForTimeout(300)
  expect(await named(page, 'first_tool_used'), 'once per browser, not per click').toHaveLength(1)
  expect(await named(page, 'first_copy_export')).toHaveLength(1)

  // No property carries anything but the allowlisted ids.
  for (const e of await events(page)) {
    for (const key of Object.keys(e.data || {})) expect(['tool', 'kind', 'plan', 'gate']).toContain(key)
  }
})

test('a signed-out visitor meeting a Pro gate is counted with the gate id', async ({ page }) => {
  await go(page, '/create/palette')
  await page.getByRole('button', { name: /^Contrast of PRIMARY/ }).click()
  await expect(page.getByRole('dialog', { name: 'Check contrast, light and dark' })).toBeVisible()
  await expect.poll(() => named(page, 'upgrade_gate_shown'))
    .toContainEqual({ name: 'upgrade_gate_shown', data: { gate: 'palette-contrast-view' } })
})
