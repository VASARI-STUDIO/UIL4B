// UPGRADE GATES AND ACTIVATION EVENTS, IN A BROWSER.
//
// WHY THIS FILE EXISTS AT ALL. tests/unit/upgrade-gate-names.test.js and
// tests/unit/activation-exports.test.js read the source and assert the wiring is
// present. Neither can see whether clicking the real button in the real page
// writes the real counter — and "a correct fix beside a test that exercises a
// helper in isolation" is this repo's most repeated failure. Every test below
// drives a CONTROL a person can click and then reads what the product actually
// recorded, so reverting any one call site fails here.
//
// WHAT IS OBSERVED. `vs-design-analytics` in localStorage — the local half of
// trackUpgradeGate / trackActivation, written unconditionally. The Firestore
// aggregate half is auth-only AND blocked outside production by
// canWriteSharedAnalytics (P-001), so a preview build writes only this. That is
// the right thing to assert against: it is the same code path, minus the
// network.
//
// EVERY ASSERTION CARRIES A POSITIVE CONTROL. "No event fired" is trivially
// true on a page that never rendered, and "the counter is 1" is trivially true
// if some other click also wrote it. So each test proves the control existed,
// proves the copy ACTUALLY LANDED by reading the clipboard back, and — for the
// activation tests — proves a neighbouring copy on the same page did NOT move
// the counter.
//
// WHY THE CLIPBOARD AND NOT THE TOAST. The first draft of this file waited for
// the "Copied" toast. It passes instantly on the SECOND copy in a test, because
// the toast is still showing "Copied" from the first one — a stale signal that
// made a real failure look green. The clipboard's contents are specific to the
// copy under test and cannot be satisfied by the previous one.

import { test, expect } from './base.js'
import { go, watch, ready } from './helpers.js'

/** The design-analytics blob this browser has written so far. */
const usage = page => page.evaluate(() => {
  try { return JSON.parse(localStorage.getItem('vs-design-analytics') || '{}').toolUsage || {} }
  catch { return {} }
})

/** One counter out of it, polled — the write lands a microtask after the copy resolves. */
const counter = (page, key) => expect.poll(async () => (await usage(page))[key])

/**
 * Chromium refuses navigator.clipboard.writeText without permission, and
 * useClipboard resolves FALSE when it does — which correctly suppresses the
 * activation. Granting it is what makes a failure here mean "the event is
 * wired wrong" rather than "the browser said no".
 */
const allowClipboard = page => page.context().grantPermissions(['clipboard-read', 'clipboard-write'])

/** What is on the clipboard now. The proof that a specific copy landed. */
const clipboard = page => expect.poll(() => page.evaluate(() => navigator.clipboard.readText()))

test.describe('upgrade gates report under their own name', () => {
  test('two different walls on one page are two different counters', async ({ page }) => {
    watch(page, 'free designer walking into the palette Pro walls')
    await go(page, '/create/palette')
    await ready(page, '/create/palette')

    // POSITIVE CONTROL 1: nothing has been recorded yet, so anything found
    // below was written by the clicks in this test.
    expect(await usage(page), 'the counter starts empty').toEqual({})

    // POSITIVE CONTROL 2: the control exists and opening it really raises the
    // canonical modal. Without this, an assertion about the counter would pass
    // on a page where the button had silently stopped rendering.
    await page.getByRole('button', { name: 'Show contrast guidance for PRIMARY' }).click()
    await expect(page.getByRole('dialog', { name: 'Check contrast, light and dark' })).toBeVisible()

    await counter(page, 'gate:palette-contrast-view').toBe(1)

    // THE POINT. The id is an identifier, not the heading the visitor read.
    // Under the old `next.gate || next.title` fallback this key was
    // "gate:Check contrast, light and dark" — display copy, which a copy edit
    // silently renames and which two different walls can share.
    expect(
      Object.keys(await usage(page)).filter(k => k.includes('Check contrast')),
      'the wall must not be counted under its display copy',
    ).toEqual([])

    await page.getByRole('button', { name: 'Close', exact: true }).click()

    // A SECOND, DIFFERENT WALL. Both of these used to be one line of the
    // dashboard whenever their titles matched; they must never merge.
    await page.getByRole('button', { name: 'Edit PRIMARY in HCT' }).click()
    await expect(page.getByRole('dialog', { name: 'Fine-tune any colour in HCT' })).toBeVisible()

    await counter(page, 'gate:palette-hct-picker').toBe(1)
    expect(
      (await usage(page))['gate:palette-contrast-view'],
      'the second wall must not bleed into the first',
    ).toBe(1)
  })
})

test.describe('activation fires from the export, not from its neighbours', () => {
  test('the palette counts its CSS export and ignores a copied hex', async ({ page }) => {
    watch(page, 'designer finishing a palette')
    await allowClipboard(page)
    await go(page, '/create/palette')
    await ready(page, '/create/palette')

    expect((await usage(page))['activation:palette:export'], 'nothing recorded yet').toBe(undefined)

    // THE DISCRIMINATION. This page has eight copy affordances and only one of
    // them is an export. Copying a single hex is a lookup: it must move the
    // clipboard and NOT the activation counter. If activation were wired to
    // `onCopy` — the shape the pipeline item rejected — this would count, and
    // the one number meant to say whether the product was useful would be
    // measuring fidgeting.
    //
    // Selected by its title, not by `.plb-tool--key.first()`: the lock toggle
    // carries the same class and comes first in the DOM, so a positional
    // selector would click a control that copies nothing and this test would
    // pass without proving anything.
    const copyHex = page.locator('button[title="Copy hex"]').first()
    await expect(copyHex, 'the per-swatch hex copy is on the page').toBeVisible()
    await copyHex.click()
    await clipboard(page).toMatch(/^#[0-9a-f]{6}$/i)

    expect(
      (await usage(page))['activation:palette:export'],
      'copying one hex is a lookup, not a finished piece of work',
    ).toBe(undefined)

    // THE EXPORT. Same clipboard, same toast — one of them is the artefact.
    const copyCss = page.getByRole('button', { name: 'Copy CSS', exact: true })
    await expect(copyCss, 'the export control is on the page').toBeVisible()
    await copyCss.click()
    // The clipboard now holds the whole palette as custom properties, not a hex.
    await clipboard(page).toMatch(/^:root \{[\s\S]*--color-/)

    await counter(page, 'activation:palette:export').toBe(1)
  })

  test('the type scale counts its export', async ({ page }) => {
    watch(page, 'developer taking the scale into code')
    await allowClipboard(page)
    await go(page, '/create/type-scale')
    await ready(page, '/create/type-scale')

    expect((await usage(page))['activation:type-scale:export'], 'nothing recorded yet').toBe(undefined)

    // The export lives in the developer view; the designer view is what mounts
    // first. Only one of the two is ever in the DOM (they are a ternary, not a
    // hidden sibling), so this is a real navigation, not a reveal.
    await page.locator('#tsc-tab-developer').click()
    const copy = page.locator('.tsc-copy-primary')
    await expect(copy, 'the export control is on the page').toBeVisible()
    await copy.click()
    await clipboard(page).toMatch(/font-size|--/)

    await counter(page, 'activation:type-scale:export').toBe(1)
  })

  test('the gradient counts its export', async ({ page }) => {
    watch(page, 'designer taking a gradient into code')
    await allowClipboard(page)
    await go(page, '/create/gradient')
    await ready(page, '/create/gradient')

    expect((await usage(page))['activation:gradient:export'], 'nothing recorded yet').toBe(undefined)

    const copy = page.locator('.ggn-copy')
    await expect(copy, 'the export control is on the page').toBeVisible()
    await copy.click()
    await clipboard(page).toMatch(/gradient/i)

    await counter(page, 'activation:gradient:export').toBe(1)
  })

  test('a tool with no row in the table records nothing', async ({ page }) => {
    // The other half of the honesty rule. /create/tint copies through the same
    // dispatcher and the same clipboard, and has no activation row — so it must
    // produce NO activation rather than an invented one. This is what stops the
    // hook quietly becoming "any copy anywhere".
    watch(page, 'designer copying a tint')
    await allowClipboard(page)
    await go(page, '/create/tint')
    await ready(page, '/create/tint')

    const copy = page.getByRole('button', { name: 'Copy row' }).first()
    // POSITIVE CONTROL: this page really does copy — otherwise "no activation"
    // would be true of a page with no working controls at all.
    await expect(copy, 'the tint tool has a copy control').toBeVisible()
    await copy.click()
    await clipboard(page).toMatch(/#[0-9a-f]{6}/i)

    expect(
      Object.keys(await usage(page)).filter(k => k.startsWith('activation:')),
      'an undeclared tool must not invent an activation',
    ).toEqual([])
  })
})
