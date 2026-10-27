// A focused text field shows ONE indicator. The global rule paints a 2px offset
// outline on :focus-visible, and a separate global rule paints an accent border
// plus a 3px halo on :focus. On the fields below both used to fire on the same
// box, so a click read as two concentric rings. This reads the computed style
// of the real focused element in a real browser, in both themes.
//
// "Rest" is read before the field is ever focused, with the pointer parked
// away from it (a few of these fields change border on hover), and the focused
// style is polled because border-color carries a transition.
import { test, expect } from './base.js'
import { go, watch, openChosenDialog } from './helpers.js'

const THEMES = ['light', 'dark']

/** Computed look of one element, read in the page. */
const look = (locator) => locator.evaluate((el) => {
  const c = getComputedStyle(el)
  return {
    outlineStyle: c.outlineStyle,
    outlineWidth: parseFloat(c.outlineWidth),
    outlineColor: c.outlineColor,
    boxShadow: c.boxShadow,
    border: c.borderTopColor,
    focusVisible: el.matches(':focus-visible'),
  }
})

const parkPointer = (page) => page.mouse.move(2, 2)

/**
 * Put the sheet that holds the global field-focus halo last in <head>, so it
 * wins every tie on specificity. Which sheet lands last depends on the build
 * and on how the route was reached, and the Home search fields only lose to
 * the halo when the global sheet is the later one. Forcing the worst order
 * makes the check hold whichever order a visitor's browser ends up with.
 */
const globalSheetLast = (page) => page.evaluate(() => new Promise((resolve, reject) => {
  const sheet = [...document.styleSheets].find((s) => {
    try { return [...s.cssRules].some((r) => r.selectorText === 'input:focus, select:focus, textarea:focus') } catch { return false }
  })
  if (!sheet || !sheet.ownerNode) return reject(new Error('global field-focus sheet not found'))
  const link = sheet.ownerNode
  link.addEventListener('load', () => resolve(), { once: true })
  document.head.appendChild(link)
}))

/**
 * Click the field, move the pointer off it (so :hover cannot colour the
 * border), and return how it looks once the border transition has finished.
 */
async function focusedLook(page, field) {
  await field.scrollIntoViewIfNeeded()
  await parkPointer(page)
  const rest = await look(field)
  await field.click()
  await parkPointer(page)
  await expect(field).toBeFocused()
  // Settled = the border has stopped moving between two reads.
  let prev = ''
  await expect.poll(async () => {
    const now = (await look(field)).border
    const settled = now === prev
    prev = now
    return settled
  }, { message: 'border colour never settled after focus' }).toBe(true)
  return { rest, focused: await look(field) }
}

function expectOneIndicator(name, { rest, focused }) {
  expect(focused.focusVisible, `${name}: the field is not matching :focus-visible, so the check proves nothing`).toBe(true)
  expect(focused.outlineStyle, `${name}: the focus outline is missing`).toBe('solid')
  expect(focused.outlineWidth, `${name}: the focus outline has no width`).toBeGreaterThan(0)
  expect(focused.outlineColor, `${name}: the focus outline is transparent`).not.toMatch(/rgba\(\s*\d+,\s*\d+,\s*\d+,\s*0\s*\)|transparent/)
  expect(focused.boxShadow, `${name}: a halo is stacked on the outline`).toBe('none')
  expect(focused.border, `${name}: the border changes colour on top of the outline`).toBe(rest.border)
}

for (const scheme of THEMES) {
  test.describe(`one focus indicator on text fields (${scheme})`, () => {
    test.use({ colorScheme: scheme })
    test.beforeEach(async ({ page }) => { watch(page, 'someone clicking into a text field') })

    test('the feedback page fields', async ({ page }) => {
      await go(page, '/feedback')
      expect(await page.evaluate(() => document.documentElement.getAttribute('data-theme'))).toBe(scheme)
      for (const [name, field] of [
        ['feedback subject', page.locator('#fb-subject')],
        ['feedback email', page.locator('#fb-email')],
        ['feedback message', page.locator('#fb-message')],
      ]) {
        expectOneIndicator(name, await focusedLook(page, field))
      }
    })

    test('the sign-in dialog email field', async ({ page }) => {
      await openChosenDialog(page, 'Log in')
      const dialog = page.getByRole('dialog')
      await expect(dialog).toBeVisible()
      expectOneIndicator('sign-in email', await focusedLook(page, dialog.getByLabel('Email')))
      expectOneIndicator('sign-in password', await focusedLook(page, dialog.getByLabel('Password')))
    })

    test('the /login page email field', async ({ page }) => {
      await go(page, '/login')
      const form = page.locator('main .auth-page-form')
      await expect(form.getByLabel('Email')).toBeVisible()
      expectOneIndicator('login page email', await focusedLook(page, form.getByLabel('Email')))
      expectOneIndicator('login page password', await focusedLook(page, form.getByLabel('Password')))
    })

    test('the SEO inspector fields', async ({ page }) => {
      await go(page, '/seo')
      const input = page.locator('.seo-field input').first()
      await expect(input).toBeVisible()
      expectOneIndicator('seo input', await focusedLook(page, input))
      expectOneIndicator('seo textarea', await focusedLook(page, page.locator('.seo-field textarea').first()))
    })

    test('the alt-text context field', async ({ page }) => {
      await go(page, '/create/alt-text')
      const field = page.locator('.alt-page .alt-field').first()
      await expect(field).toBeVisible()
      expectOneIndicator('alt-text context', await focusedLook(page, field))
    })

    test('the colour picker hex field', async ({ page }) => {
      await go(page, '/create/gradient')
      await page.locator('.cpk-trigger').first().click()
      await expect(page.locator('.cpk-pop')).toBeVisible()
      expectOneIndicator('picker hex', await focusedLook(page, page.locator('.cpk-hex')))
    })

    test('the gradient angle field', async ({ page }) => {
      await go(page, '/create/gradient')
      const angle = page.getByRole('spinbutton', { name: 'Gradient angle in degrees' })
      await expect(angle).toBeVisible()
      expectOneIndicator('gradient angle', await focusedLook(page, angle))
    })

    test('the gradient stop hex field', async ({ page }) => {
      await go(page, '/create/gradient')
      const hex = page.getByRole('textbox', { name: 'Stop 1 hex' })
      await expect(hex).toBeVisible()
      expectOneIndicator('gradient stop hex', await focusedLook(page, hex))
    })

    test('the Home search fields leave the underline on the wrapper and the halo off the input', async ({ page }) => {
      await go(page, '/')
      await globalSheetLast(page)
      for (const placeholder of ['Search the set', 'Search families']) {
        const input = page.getByPlaceholder(placeholder)
        const wrapper = page.locator('label.sp-find', { has: input })
        await input.scrollIntoViewIfNeeded()
        await parkPointer(page)
        const restShadow = await wrapper.evaluate((el) => getComputedStyle(el).boxShadow)
        await input.click()
        await parkPointer(page)
        await expect(input).toBeFocused()
        await expect.poll(() => wrapper.evaluate((el) => getComputedStyle(el).boxShadow), {
          message: `${placeholder}: the wrapper underline never appeared`,
        }).not.toBe(restShadow)
        expect((await look(input)).boxShadow, `${placeholder}: the input paints its own halo`).toBe('none')
        expect(await wrapper.evaluate((el) => getComputedStyle(el).boxShadow), `${placeholder}: the wrapper lost its underline`).toMatch(/inset/)
      }
    })
  })
}
