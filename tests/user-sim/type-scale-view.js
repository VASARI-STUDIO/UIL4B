// How /create/type-scale arranges its work column, for the specs that drive it.
//
// The page measures the work column (.tsc-output), not the viewport. From
// SPLIT_MIN (1024px of column) the ladder and the page sit side by side and Code
// is a view of the right half, chosen with the Page | Code switch
// (.tsc-half-switch); below it one of Scale / Page / Code shows at a time
// behind a tablist. A 1440 window gives a column of about 1046px,
// so it is the split; 1024 and 768 windows keep the tablist.
//
// The column is measured after mount, so the first paint is the narrow layout
// even at 1440. Anything that reads the layout has to wait for the marker rather
// than look straight after `go()`.

import { expect } from './base.js'

// The column width at which the page splits. Duplicated from TypeScale.jsx on
// purpose: a spec that imported the constant would move with it and never notice.
export const SPLIT_MIN = 1024

/** Wait for the layout the measured column calls for, and return which it is. */
export async function settleTypeScaleView(page) {
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
 * in the split's Page | Code switch, press the Code tab otherwise. Safe to call
 * when the code is already showing.
 */
export async function showTypeScaleCode(page) {
  const layout = await settleTypeScaleView(page)
  if (layout === 'split') {
    const half = page.locator('.tsc-half-switch').getByRole('button', { name: 'Code', exact: true })
    if ((await half.getAttribute('aria-pressed')) !== 'true') await half.click()
    await expect(page.locator('#tsc-export')).toBeVisible()
    return layout
  }
  await page.getByRole('tab', { name: 'Code' }).click()
  await expect(page.locator('#tsc-export')).toBeVisible()
  return layout
}

/**
 * Show the page preview: in the split press Page in the right half's switch (the
 * half may be showing Code), below it press the Page tab. Safe to call when the
 * page is already showing.
 */
export async function showTypeScalePage(page) {
  const layout = await settleTypeScaleView(page)
  if (layout === 'split') {
    const half = page.locator('.tsc-half-switch').getByRole('button', { name: 'Page', exact: true })
    if ((await half.getAttribute('aria-pressed')) !== 'true') await half.click()
  } else {
    await page.getByRole('tab', { name: 'Page' }).click()
  }
  await expect(page.locator('.tsk')).toBeVisible()
  return layout
}

/** Show the ladder: it is already beside the page in the split. */
export async function showTypeScaleLadder(page) {
  const layout = await settleTypeScaleView(page)
  if (layout === 'switch') await page.getByRole('tab', { name: 'Scale' }).click()
  await expect(page.locator('.tsc-row').first()).toBeVisible()
  return layout
}
