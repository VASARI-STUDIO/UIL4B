// The brand kit walkthrough bar, as a person meets it at each width.
//
//   · 1024px and up: a glass pill with the four steps, "What's this?", Leave and Next.
//   · 768 to 1023px: a 60px docked row with the same controls.
//   · under 768px: a 60px docked bar holding a progress strip, ONE steps trigger
//     and Next. The four steps, the help line and "Close the walkthrough" are in
//     a panel that opens upward from the trigger.
//
// These helpers pick the control a person would use at the current viewport, so a
// spec can keep saying what it means (open the help, go to a step, leave) without
// repeating the width branch. The width is read when each helper runs, so a spec
// that resizes the viewport part-way still gets the right control.

import { expect } from './base.js'

export const PHONE_MAX = 767

export const kitRail = (page) => page.getByRole('region', { name: 'Brand kit walkthrough' })

export const isPhone = (page) => (page.viewportSize()?.width ?? 1280) <= PHONE_MAX

/** The phone's steps trigger (the only way into the steps, help and Close on a phone). */
export const stepsTrigger = (page) => kitRail(page).locator('button.bkit-rail-steps')

/** The phone's steps panel: a non-modal dialog named "Brand kit". */
export const stepsPanel = (page) => page.getByRole('dialog', { name: 'Brand kit', exact: true })

/** The card that holds the orientation copy and the step list at this width. */
export const helpCard = (page) => (isPhone(page)
  ? stepsPanel(page)
  : page.getByRole('dialog', { name: /^Step [1-4] of 4: / }))

/** The control that opens the help card: the steps trigger on a phone, "What's this?" above. */
export const helpTrigger = (page) => (isPhone(page)
  ? stepsTrigger(page)
  : kitRail(page).getByRole('button', { name: /What.s this\?/ }))

/** Opens the help card if it is closed, and waits for it. */
export async function openHelp(page) {
  const card = helpCard(page)
  if (!(await card.isVisible())) await helpTrigger(page).click()
  await card.waitFor({ state: 'visible' })
  return card
}

/** A link to one of the four steps, with whatever has to be open to reach it. */
export async function stepLink(page, name) {
  if (isPhone(page)) return (await openHelp(page)).getByRole('link', { name })
  return kitRail(page).getByRole('link', { name })
}

/** The control that ends the walkthrough in place. A phone's lives in the steps panel. */
export async function leaveControl(page) {
  if (isPhone(page)) return (await openHelp(page)).getByRole('button', { name: /^Close the walkthrough/ })
  return kitRail(page).getByRole('button', { name: 'Leave the walkthrough' })
}

export async function leaveWalkthrough(page) {
  await (await leaveControl(page)).click()
}

/**
 * Waits until the bar on screen is the one for this step. A navigation changes the
 * URL before the page, and the bar of the page being left is in the DOM until the
 * new page has rendered its own, so a spec that goes on to open the steps panel
 * should wait for this first.
 */
export async function expectOnStep(page, label, number) {

  if (isPhone(page)) {
    await expect(stepsTrigger(page)).toHaveAttribute('aria-label', new RegExp(`^${label}, step ${number} of 4`))
  } else {
    await expect(kitRail(page).locator('.bkit-step[aria-current="step"]')).toContainText(label)
  }
}
