// How /create/type-scale arranges its work column, for the specs that drive it.
//
// The page measures the work column (.tsc-output), not the viewport. From
// SPLIT_MIN (1024px of column) the ladder and the page sit side by side and Code
// is a view of the right half, chosen with the Page | Code switch
// (.tsc-half-switch); below it one of Scale / Page / Code shows at a time
// behind a tablist. A 1440 window gives a column of about 1046px,
// so it is the split; 1024 and 768 windows keep the tablist. A phone (767px and
// under) has neither: the width, the page and the ladder are one scroll, and Code
// is a tab in the settings sheet the dock opens.
//
// The column is measured after mount, so the first paint is the narrow layout
// even at 1440. Anything that reads the layout has to wait for the marker rather
// than look straight after `go()`.

import { expect } from './base.js'

// The viewport width at which the phone's one scroll takes over from the tablist.
// Duplicated from the page's media query for the same reason as SPLIT_MIN.
export const PHONE_MAX = 767

// The column width at which the page splits. Duplicated from TypeScale.jsx on
// purpose: a spec that imported the constant would move with it and never notice.
export const SPLIT_MIN = 1024

/** Wait for the layout the screen calls for, and return which it is: 'stack' (phone), 'switch' or 'split'. */
export async function settleTypeScaleView(page) {
  const viewport = page.viewportSize()
  if (viewport && viewport.width <= PHONE_MAX) {
    await expect(page.locator('#tsc-view-panel'), 'a phone shows the width, the page and the ladder as one scroll').toHaveAttribute('data-view', 'stack')
    await expect(page.locator('.tsc-view-switch')).toHaveCount(0)
    return 'stack'
  }
  const column = page.locator('.tsc-output')
  await column.waitFor({ state: 'visible' })
  const width = await column.evaluate(el => el.clientWidth)
  const panel = page.locator('#tsc-view-panel')
  if (width >= SPLIT_MIN) {
    await expect(panel, `the ${width}px work column should be split`).toHaveAttribute('data-view', 'split')
    return 'split'
  }
  await expect(page.locator('.tsc-view-switch'), `the ${width}px work column should keep the switch`).toBeVisible()
  return 'switch'
}

/**
 * Show the exported code the way a visitor does at the current width: press Code
 * in the split's Page | Code switch, press the Code tab otherwise; on a phone open
 * the settings sheet from the dock and press its Code tab. Safe to call when the
 * code is already showing.
 */
export async function showTypeScaleCode(page) {
  const layout = await settleTypeScaleView(page)
  if (layout === 'split') {
    const half = page.locator('.tsc-half-switch').getByRole('button', { name: 'Code', exact: true })
    if ((await half.getAttribute('aria-pressed')) !== 'true') await half.click()
    await expect(page.locator('#tsc-export')).toBeVisible()
    return layout
  }
  if (layout === 'stack') {
    const sheet = page.locator('#tsc-sheet')
    if ((await sheet.getAttribute('data-open')) !== 'true') await page.locator('.tl-dock .tsc-dock-ratio').click()
    await expect(sheet).toBeVisible()
    await sheet.getByRole('button', { name: 'Code', exact: true }).click()
    await expect(page.locator('#tsc-export')).toBeVisible()
    return layout
  }
  await page.getByRole('tab', { name: 'Code' }).click()
  await expect(page.locator('#tsc-export')).toBeVisible()
  return layout
}

/**
 * Show the page preview: in the split press Page in the right half's switch (the
 * half may be showing Code), below it press the Page tab; a phone already has the
 * page in its one scroll. Safe to call when the page is already showing.
 */
export async function showTypeScalePage(page) {
  const layout = await settleTypeScaleView(page)
  if (layout === 'split') {
    const half = page.locator('.tsc-half-switch').getByRole('button', { name: 'Page', exact: true })
    if ((await half.getAttribute('aria-pressed')) !== 'true') await half.click()
  } else if (layout === 'switch') {
    await page.getByRole('tab', { name: 'Page' }).click()
  }
  await expect(page.locator('.tsk')).toBeVisible()
  return layout
}

/** Show the ladder: it is already beside the page in the split, and in the phone's one scroll. */
export async function showTypeScaleLadder(page) {
  const layout = await settleTypeScaleView(page)
  if (layout === 'switch') await page.getByRole('tab', { name: 'Scale' }).click()
  await expect(page.locator('.tsc-row').first()).toBeVisible()
  return layout
}
