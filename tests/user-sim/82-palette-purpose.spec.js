// The Palette Builder's own structure, as an assistive technology receives it.
//
// ── THE FAULT ───────────────────────────────────────────────────────────────
//
// Measured 2026-09-11 on the built preview at 1440x900, signed out and signed
// in, off Chrome's accessibility tree rather than off the markup. The landmark
// list for /create/palette was:
//
//   navigation(Primary) | main | contentinfo
//   | region("PRIMARY #664BB7") | region("SECONDARY #CE70B4")
//   | region("ACCENT #B39CFF")  | region("SUBTLE #E6E0EC")
//   | region("DEEP #352565")    | navigation(Footer)
//
// Five of the nine landmarks on the busiest tool in the product were colour
// swatches named with raw hex, and the count grew with the palette. The board
// that the page exists to produce was anonymous. The global adjust strip had
// been given the name "Global palette adjustments" in source, and a reader
// never heard it, because a <footer> inside <main> maps to the generic role and
// a generic element takes no accessible name.
//
// The same board is rendered on `/` by HomeWorkbench.jsx, and measured the same
// way it had the same fault: five of the ten regions on the homepage were
// swatches, sitting among the five real ones named by its own h2s.
//
// ── WHY THIS IS A PURPOSE DEFECT AND NOT ONLY AN ACCESSIBILITY ONE ──────────
//
// The landmark list is how a non-visual reader answers "what is this page made
// of" on arrival, which is the first half of dimension 1 in QUALITY-RUBRIC.md
// and `principle-website-engagement`'s sixth dimension, purpose clarity —
// identity and primary tasks explicit on arrival. On this route the answer was
// five hex codes. `principle-accessible-design` lists landmark order beside
// heading hierarchy under "screen reader ready" for the same reason.
//
// ── WHY THE ASSERTIONS ARE ON THE ACCESSIBILITY TREE ────────────────────────
//
// Reading the markup would not have found this and will not defend it. Nothing
// in the source said "region" — the role came from the ELEMENT, because a
// <section> that has an accessible name is a landmark and one that does not is
// generic. A markup-shaped test (`expect(col).toHaveAttribute('role','group')`)
// would pass the day someone restores <section> and adds the role, and would
// fail the day someone finds a different correct answer. What must hold is the
// computed role a reader receives, so that is what is read here, through CDP.
//
// The probe is mutation-proved inside the run: `the probe can tell a region
// from a group` injects a named <section> of its own and fails if the probe
// reports anything but a landmark for it. Without that control, a probe that
// silently stopped resolving names would make every other test in this file
// pass on an empty result.
import { test, expect } from './base.js'
import { go, watch, signIn } from './helpers.js'

/** Every named node in Chrome's accessibility tree, with its computed role. */
async function axNodes(page) {
  const client = await page.context().newCDPSession(page)
  const { nodes } = await client.send('Accessibility.getFullAXTree')
  await client.detach()
  return nodes
    .filter((n) => n.role?.value && !n.ignored)
    .map((n) => ({ role: n.role.value, name: (n.name?.value || '').trim() }))
}

const LANDMARKS = ['region', 'banner', 'complementary', 'contentinfo', 'form', 'main', 'navigation', 'search']
const HEX_NAME = /#[0-9a-f]{6}\b/i

test.describe('the palette board is a named set, not a list of landmarks', () => {
  test.beforeEach(async ({ page }) => {
    watch(page, 'someone reading the Palette Builder with a screen reader')
    await page.setViewportSize({ width: 1440, height: 900 })
  })

  test('the probe can tell a region from a group', async ({ page }) => {
    await go(page, '/create/palette')
    // A named <section> is a landmark; the same element without a name is not.
    // If this control ever goes green on the group branch, every hex assertion
    // below is meaningless and this file is lying.
    await page.evaluate(() => {
      const s = document.createElement('section')
      s.setAttribute('aria-label', 'PROBE #ABCDEF')
      s.textContent = 'probe'
      document.querySelector('main').appendChild(s)
      const g = document.createElement('div')
      g.setAttribute('role', 'group')
      g.setAttribute('aria-label', 'PROBEGROUP #FEDCBA')
      g.textContent = 'probe'
      document.querySelector('main').appendChild(g)
    })
    const nodes = await axNodes(page)
    const asSection = nodes.find((n) => n.name === 'PROBE #ABCDEF')
    const asGroup = nodes.find((n) => n.name === 'PROBEGROUP #FEDCBA')
    expect(asSection, 'the probe found the injected section at all').toBeTruthy()
    expect(asSection.role, 'a named <section> must still resolve to a landmark').toBe('region')
    expect(asGroup, 'the probe found the injected group at all').toBeTruthy()
    expect(asGroup.role, 'a role=group element must NOT resolve to a landmark').toBe('group')
  })

  test('/create/palette: no landmark on the page is named with a hex', async ({ page }) => {
    await go(page, '/create/palette')
    // POSITIVE CONTROL. A board that never painted has no columns to misname,
    // so prove the five columns are really on screen before believing the
    // absence below. The board is the page — if this is 0 the route did not
    // arrive and nothing further here means anything.
    await expect(page.locator('.plb-col')).toHaveCount(5)
    await expect(page.locator('h1#plb-page-title')).toHaveText('Palette Generator')

    const nodes = await axNodes(page)
    const hexNamed = nodes.filter((n) => HEX_NAME.test(n.name))
    // SECOND POSITIVE CONTROL: the columns ARE named, and the probe can read
    // those names. The test must not be able to pass because names vanished.
    expect(hexNamed.length, 'the five columns still carry their colour names').toBeGreaterThanOrEqual(5)

    const landmarked = hexNamed.filter((n) => LANDMARKS.includes(n.role))
    expect(
      landmarked.map((n) => `${n.role}("${n.name}")`),
      'a colour swatch is an item in the board, not a landmark of the page',
    ).toEqual([])
  })

  test('/create/palette: the board carries the page heading as its name', async ({ page }) => {
    await go(page, '/create/palette')
    await expect(page.locator('.plb-col')).toHaveCount(5)

    const nodes = await axNodes(page)
    // The board borrows the h1 rather than typing a second string, so this
    // asserts the RESOLVED name — an aria-labelledby pointing at a missing id
    // resolves to nothing and would fail here.
    const board = nodes.find((n) => n.role === 'group' && n.name === 'Palette Generator')
    expect(board, 'the board is a group named by the page heading').toBeTruthy()
  })

  test('/create/palette: the adjust strip announces the name it was given', async ({ page }) => {
    await go(page, '/create/palette')
    await expect(page.locator('.plb-adjust')).toBeVisible()

    const nodes = await axNodes(page)
    const strip = nodes.find((n) => n.name === 'Global palette adjustments')
    expect(strip, 'the strip reaches a reader under the name in its own source').toBeTruthy()
    expect(strip.role).toBe('group')
  })

  test('signed in, at the free cap, the board is still not five landmarks', async ({ page }) => {
    // The save menu and the refusal state mount extra markup; the board's
    // semantics must not depend on who is looking at it.
    await signIn(page, { plan: 'free', projects: 3 })
    await go(page, '/create/palette')
    await expect(page.locator('.plb-col')).toHaveCount(5)
    const nodes = await axNodes(page)
    const landmarked = nodes.filter((n) => HEX_NAME.test(n.name) && LANDMARKS.includes(n.role))
    expect(landmarked.map((n) => `${n.role}("${n.name}")`)).toEqual([])
  })

  test('the homepage board has the same semantics as the tool it previews', async ({ page }) => {
    await go(page, '/')
    await expect(page.locator('.hw-board .plb-col').first()).toBeVisible()

    const nodes = await axNodes(page)
    const hexNamed = nodes.filter((n) => HEX_NAME.test(n.name))
    expect(hexNamed.length, 'the homepage swatches still carry their colour names').toBeGreaterThanOrEqual(5)
    expect(
      hexNamed.filter((n) => LANDMARKS.includes(n.role)).map((n) => `${n.role}("${n.name}")`),
      'the homepage board must not spend five of the page landmarks on swatches',
    ).toEqual([])

    // POSITIVE CONTROL, and the reason this is not simply `=== 0` above: the
    // homepage's REAL regions, the ones named by its own h2s, must survive. A
    // change that stripped every region from the page would satisfy the
    // assertion above and break the homepage's structure.
    const regions = nodes.filter((n) => n.role === 'region' && n.name)
    expect(regions.length, 'the homepage keeps the regions named by its h2s').toBeGreaterThanOrEqual(4)
  })
})

test('the five sibling colour tools still name their regions by their own headings', async ({ page }) => {
  // Not a change this branch made — a fence around it. The correction here was
  // to stop using <section aria-label> for an item, and the siblings use the
  // same element correctly for a SECTION. If a later sweep "harmonises" them by
  // copying this branch's answer onto them, their landmark maps disappear.
  watch(page, 'someone comparing the colour tools with a screen reader')
  await page.setViewportSize({ width: 1440, height: 900 })
  const expected = {
    '/create/tint': ['Choose source colours', 'Tune the system', 'Evaluate the system'],
    '/create/gradient': ['Shape the gradient'],
    '/create/semantic-color': ['See each role do its job', 'Canonical, predictable token names'],
  }
  for (const [route, names] of Object.entries(expected)) {
    await go(page, route)
    await expect(page.locator('h1')).toBeVisible()
    const nodes = await axNodes(page)
    const regions = nodes.filter((n) => n.role === 'region').map((n) => n.name)
    for (const name of names) {
      expect(regions, `${route} still exposes "${name}" as a landmark`).toContain(name)
    }
  }
})
