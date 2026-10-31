// SETTINGS HIERARCHY AND TYPE: what a person sees when they open each section.
//
// Held here:
//   1. the section tabs run Account, Plan and billing, Appearance, Language,
//      Your data, Privacy, and each panel's heading matches its tab;
//   2. Account is three sibling cards (Public profile, Sign-in and security,
//      Delete account), none inside another, with Sign out in the second;
//   3. a Google-only account has no Password row and shows "Signed in with
//      Google"; a password account shows "Email and password" and its Password row;
//   4. a Pro plan is labelled fact rows with long dates, and a plan that ends
//      says "Ends on ..." and never "Renews"; a Free account has no fact rows;
//   5. signed out, the page opens on Appearance, even with Account remembered;
//   6. every open field has a label and every Edit button its own name;
//   7. Bio is a textarea with a live count, Enter adds a line, Ctrl or Cmd
//      plus Enter saves;
//   8. the content column stops at 720px on a wide screen;
//   9. at 390 and 360 no section scrolls sideways and its controls are 44px;
//  10. the fact labels and values read at 4.5:1 or better, light and dark;
//  11. labels use the UI sans, in sentence case; settings.css holds no raw
//      #fff or rgba();
//  12. the Pro delete list says billing stops and promises no refund.
//
// MUTATIONS (each turns the tests named red):
//   the 'support' tab label set back to 'Subscription'          -> "the sections run ..." and 19's order test
//   PasswordChange renders its row for a Google-only account    -> "a Google-only account has no Password row ..."
//   the Bio Ctrl/Cmd+Enter branch removed from EditField        -> "Bio saves on Ctrl+Enter ..."
import fs from 'node:fs'
import path from 'node:path'
import { test, expect } from './base.js'
import { go, signIn, watch } from './helpers.js'
import { withAvailability } from './price-payload.js'

const PERIOD_END = Date.UTC(2027, 2, 4, 12)
const TRIAL_END = Date.UTC(2026, 10, 14, 12)

async function openSection(page, id) {
  // On a phone the sections are a list you open and come back from.
  const tab = page.locator(`#settab-${id}`)
  if (!(await tab.isVisible())) await page.getByRole('button', { name: 'All settings' }).click()
  await tab.click()
  await expect(page.locator(`#set-${id}`)).toBeVisible()
}

async function stubPrices(page) {
  await page.route('**/api/get-prices*', (r) => r.fulfill({
    status: 200, contentType: 'application/json',
    body: JSON.stringify(withAvailability({ monthly: { usd: 7 }, quarterly: { usd: 18 }, yearly: { usd: 48 } })),
  }))
}

const proSub = (extra = {}) => ({ status: 'active', interval: 'monthly', currentPeriodEnd: PERIOD_END, cancelAtPeriodEnd: false, ...extra })

/** The [label, value] pairs of the Pro plan card, in the order they are drawn. */
const factPairs = (page) => page.locator('#set-support .settings-row--fact').evaluateAll((rows) => rows.map((row) => [
  row.querySelector('.settings-row-label').textContent.trim(),
  row.querySelector('.settings-row-value').textContent.trim(),
]))

test.describe('settings hierarchy: sections and headings', () => {
  test('the sections run Account, Plan and billing, Appearance, Language, Your data, Privacy', async ({ page }) => {
    watch(page, 'a free account reading the section names')
    await signIn(page, { plan: 'free' })
    await go(page, '/settings')

    const names = await page.getByRole('tab').evaluateAll((els) => els.map((el) => el.textContent.trim()))
    expect(names).toEqual(['Account', 'Plan and billing', 'Appearance', 'Language', 'Your data', 'Privacy'])
    // Each tab opens a panel whose heading is the tab's own name.
    for (const [id, heading] of [['account', 'Account'], ['support', 'Plan and billing'], ['accessibility', 'Appearance'], ['language', 'Language'], ['data', 'Your data']]) {
      await openSection(page, id)
      await expect(page.locator(`#set-${id}`).getByRole('heading', { level: 2, name: heading })).toBeVisible()
    }
    await openSection(page, 'accessibility')
    await expect(page.locator('#set-accessibility')).toContainText('Theme and motion. Both are also in the menu at the top of every page.')
  })

  test('Your data links to the privacy policy as "Read the privacy policy"', async ({ page }) => {
    watch(page, 'a person looking for the privacy policy')
    await signIn(page, { plan: 'free' })
    await go(page, '/settings')
    await openSection(page, 'data')
    const link = page.locator('#set-data').getByRole('link', { name: 'Read the privacy policy' })
    await expect(link).toHaveAttribute('href', '/privacy')
    await expect(page.getByText('Full disclosure')).toHaveCount(0)
  })
})

test.describe('settings hierarchy: Account in three cards', () => {
  test('Public profile, Sign-in and security and Delete account are siblings, and Sign out is in the second', async ({ page }) => {
    watch(page, 'a password account reading its Account page')
    await signIn(page, { plan: 'free' })
    await go(page, '/settings')
    await openSection(page, 'account')
    const section = page.locator('#set-account')

    const cards = section.locator('.settings-cards > .settings-card')
    await expect(cards).toHaveCount(3)
    await expect(cards.locator('> .settings-card-h h3')).toHaveText(['Public profile', 'Sign-in and security', 'Delete account'])
    await expect(section.getByRole('heading', { level: 3 })).toHaveText(['Public profile', 'Sign-in and security', 'Delete account'])
    // No card sits inside another.
    await expect(section.locator('.settings-card .settings-card')).toHaveCount(0)
    // The old red caption is gone.
    await expect(section).not.toContainText('Danger zone')
    await expect(section.locator('.danger-zone-h')).toHaveCount(0)

    const profile = section.getByRole('group', { name: 'Public profile' })
    const signin = section.getByRole('group', { name: 'Sign-in and security' })
    const del = section.getByRole('group', { name: 'Delete account' })
    for (const label of ['Display name', 'Location', 'Company or studio', 'Website', 'Bio', 'Flair']) {
      await expect(profile.locator('.settings-row-label', { hasText: new RegExp(`^${label}$`) }), `${label} is not in Public profile`).toHaveCount(1)
    }
    await expect(profile.getByRole('button', { name: 'Sign out' })).toHaveCount(0)
    await expect(signin.getByRole('button', { name: 'Sign out', exact: true })).toBeVisible()
    await expect(signin.getByRole('button', { name: 'Edit email address' })).toBeVisible()
    await expect(signin.getByRole('button', { name: 'Change password' })).toBeVisible()
    await expect(del.getByRole('button', { name: 'Delete account' })).toBeVisible()
    await expect(section.getByRole('button', { name: 'Sign out' })).toHaveCount(1)

    // 32px between cards (--s-6) on a wide screen.
    const boxes = await cards.evaluateAll((els) => els.map((el) => el.getBoundingClientRect()))
    expect(boxes[1].top - boxes[0].bottom, 'gap between the first two cards').toBeGreaterThanOrEqual(31.5)
    expect(boxes[2].top - boxes[1].bottom, 'gap between the last two cards').toBeGreaterThanOrEqual(31.5)
  })

  test('a password account says it signs in with email and password, and has a Password row', async ({ page }) => {
    watch(page, 'a person with an email and password account')
    await signIn(page, { plan: 'free' })
    await go(page, '/settings')
    await openSection(page, 'account')
    const signin = page.locator('#set-account').getByRole('group', { name: 'Sign-in and security' })
    const method = signin.locator('.settings-row', { has: page.getByText('Signed in with', { exact: true }) })
    await expect(method.locator('.settings-row-value')).toHaveText('Email and password')
    // Read-only: the row holds no control.
    await expect(method.getByRole('button')).toHaveCount(0)
    await expect(signin.locator('.settings-row-label', { hasText: /^Password$/ })).toHaveCount(1)
    await expect(signin.getByRole('button', { name: 'Change password' })).toHaveCount(1)
  })

  test('a Google-only account has no Password row and shows "Signed in with Google"', async ({ page }) => {
    watch(page, 'a person who signs in with Google')
    const { email } = await signIn(page, { plan: 'free', provider: 'google.com' })
    await go(page, '/settings')
    await openSection(page, 'account')
    const signin = page.locator('#set-account').getByRole('group', { name: 'Sign-in and security' })
    const method = signin.locator('.settings-row', { has: page.getByText('Signed in with', { exact: true }) })
    await expect(method.locator('.settings-row-value')).toHaveText('Google')
    await expect(method).toContainText(email)
    await expect(method.getByRole('button')).toHaveCount(0)
    // No Password row, no Change password button, and the method is said once.
    await expect(signin.locator('.settings-row-label', { hasText: /^Password$/ })).toHaveCount(0)
    await expect(signin.getByRole('button', { name: 'Change password' })).toHaveCount(0)
    await expect(signin.getByText('Signed in with Google')).toHaveCount(0)
    await expect(signin.getByText('Managed by your Google account')).toBeVisible()
    await expect(signin.getByRole('button', { name: 'Sign out', exact: true })).toBeVisible()
  })
})

test.describe('settings hierarchy: Plan and billing', () => {
  test.use({ locale: 'en-AU', timezoneId: 'UTC' })

  for (const [interval, extra, cycle] of [
    ['monthly', {}, 'Monthly'],
    ['month', { intervalCount: 3 }, 'Every three months'],
    ['yearly', {}, 'Yearly'],
  ]) {
    test(`a ${cycle.toLowerCase()} Pro plan is Plan, Status, Billing cycle and Next payment, with a long date`, async ({ page }) => {
      watch(page, `a ${cycle.toLowerCase()} subscriber reading their plan`)
      await signIn(page, { plan: 'pro', subscription: proSub({ interval, ...extra }) })
      await go(page, '/settings')
      await openSection(page, 'support')

      expect(await factPairs(page)).toEqual([
        ['Plan', 'UIL4B Pro'],
        ['Status', 'Active'],
        ['Billing cycle', cycle],
        ['Next payment', '4 March 2027'],
      ])
      await expect(page.locator('#set-support')).not.toContainText('Ends on')
    })
  }

  test('a plan that ends at the period end says "Ends on", with the date, and never "Renews"', async ({ page }) => {
    watch(page, 'a subscriber who has cancelled')
    await signIn(page, { plan: 'pro', subscription: proSub({ cancelAtPeriodEnd: true }) })
    await go(page, '/settings')
    await openSection(page, 'support')
    const section = page.locator('#set-support')

    expect(await factPairs(page)).toEqual([
      ['Plan', 'UIL4B Pro'],
      ['Status', 'Ends on 4 March 2027'],
      ['Billing cycle', 'Monthly'],
    ])
    await expect(section).toContainText('Your plan ends on 4 March 2027. Open billing to keep Pro.')
    await expect(section).not.toContainText('Renews')
    await expect(section.getByText('Next payment')).toHaveCount(0)
    // Cancelling twice is not offered.
    await expect(section.getByRole('button', { name: 'Cancel plan' })).toHaveCount(0)
    await expect(section.getByRole('button', { name: 'Manage billing' })).toBeVisible()
  })

  test('a free trial says when it ends and shows no next payment', async ({ page }) => {
    watch(page, 'a subscriber on a free trial')
    await signIn(page, { plan: 'pro', subscription: proSub({ status: 'trialing', trialEndsAt: TRIAL_END, currentPeriodEnd: TRIAL_END }) })
    await go(page, '/settings')
    await openSection(page, 'support')
    const pairs = await factPairs(page)
    expect(pairs[1]).toEqual(['Status', 'Free trial until 14 November 2026'])
    expect(pairs.map(([label]) => label)).not.toContain('Next payment')
  })

  test('an admin account keeps one note instead of billing facts', async ({ page }) => {
    watch(page, 'the founder reading their plan')
    await signIn(page, { plan: 'pro', admin: true, subscription: null })
    await go(page, '/settings')
    await openSection(page, 'support')
    expect(await factPairs(page)).toEqual([['Plan', 'UIL4B Pro']])
    await expect(page.locator('#set-support')).toContainText('Admin account — Pro included, no billing')
    await expect(page.locator('#set-support').getByText('Billing cycle')).toHaveCount(0)
  })

  test.describe('a free account', () => {
    // US English, so the price list (USD only) has a live price for this visitor.
    test.use({ locale: 'en-US' })

    test('sees its current plan and a link to /plans, and no fact rows', async ({ page }) => {
      watch(page, 'a free account reading Plan and billing')
      await stubPrices(page)
      await signIn(page, { plan: 'free' })
      await go(page, '/settings')
      await openSection(page, 'support')
      const section = page.locator('#set-support')
  
      await expect(section.getByRole('heading', { level: 2, name: 'Plan and billing' })).toBeVisible()
      await expect(section.locator('.sub-tier-free')).toContainText('Your current plan')
      await expect(section.getByRole('link', { name: 'Upgrade to Pro' })).toHaveAttribute('href', /^\/plans/)
      await expect(section.locator('.settings-row--fact')).toHaveCount(0)
      await expect(section.getByText('Billing cycle')).toHaveCount(0)
      await expect(section.getByText('Next payment')).toHaveCount(0)
    })
  })
})

test.describe('settings hierarchy: signed out', () => {
  test('opens on Appearance, and a remembered Account falls back to it', async ({ page }) => {
    watch(page, 'a signed-out visitor whose last section was Account')
    await page.addInitScript(() => { try { localStorage.setItem('vs-settings-section', 'account') } catch { /* private mode */ } })
    await go(page, '/settings')

    await expect(page.getByRole('tab', { selected: true })).toHaveAttribute('id', 'settab-accessibility')
    await expect(page.locator('#set-accessibility')).toBeVisible()
    await expect(page.getByRole('heading', { level: 2, name: 'Appearance' })).toBeVisible()
    await expect(page.locator('#settab-account')).toHaveCount(0)
    await expect(page.locator('#set-account')).toHaveCount(0)
    await expect(page.getByRole('tab').filter({ hasText: 'Plan and billing' })).toHaveCount(1)
  })
})

test.describe('settings hierarchy: names for every control', () => {
  test('every Edit button is named for its field, and every open field has a label', async ({ page }) => {
    watch(page, 'a screen-reader user editing their profile')
    await signIn(page, { plan: 'free' })
    await go(page, '/settings')
    await openSection(page, 'account')
    const section = page.locator('#set-account')

    // A bare "Edit" names nothing; each button carries its field.
    await expect(section.getByRole('button', { name: 'Edit', exact: true })).toHaveCount(0)
    await expect(section.getByRole('button', { name: 'Edit email address' })).toHaveCount(1)
    await expect(section.getByRole('button', { name: 'Change password' })).toHaveCount(1)
    await expect(section.getByRole('button', { name: 'Add flair' })).toHaveCount(1)

    for (const label of ['Display name', 'Location', 'Company or studio', 'Website', 'Bio']) {
      await section.getByRole('button', { name: `Edit ${label.toLowerCase()}` }).click()
      const field = section.getByLabel(label, { exact: true })
      await expect(field, `${label}: no field is labelled "${label}"`).toBeVisible()
      expect(await field.evaluate((el) => el.tagName), `${label}: the wrong control`).toBe(label === 'Bio' ? 'TEXTAREA' : 'INPUT')
      await section.getByRole('button', { name: 'Cancel' }).click()
      await expect(field).toHaveCount(0)
    }

    // The sign-in fields too: email (both steps) and the three password fields.
    await section.getByRole('button', { name: 'Edit email address' }).click()
    await expect(section.getByLabel('New email address')).toBeVisible()
    await section.getByLabel('New email address').fill('new.address@uil4b.test')
    await section.getByRole('button', { name: 'Next' }).click()
    await expect(section.getByLabel('Your password')).toBeVisible()
    await section.getByRole('button', { name: 'Back' }).click()
    await section.getByRole('button', { name: 'Cancel' }).click()
    await section.getByRole('button', { name: 'Change password' }).click()
    for (const name of ['Current password', 'New password', 'Confirm new password']) {
      await expect(section.getByLabel(name, { exact: true })).toBeVisible()
    }

    // And as a sweep: no visible field in the section is left without a name.
    const unnamed = await section.locator('input:not([type="hidden"]):not([type="file"]), textarea').evaluateAll((els) => els.filter((el) => {
      const byLabel = [...(el.labels || [])].map((l) => l.textContent.trim()).join('')
      const byAria = el.getAttribute('aria-label') || ''
      const byIds = (el.getAttribute('aria-labelledby') || '').split(/\s+/).map((id) => document.getElementById(id)?.textContent.trim() || '').join('')
      return !(byLabel || byAria.trim() || byIds)
    }).map((el) => el.outerHTML.slice(0, 80)))
    expect(unnamed, 'fields with no accessible name').toEqual([])
  })

  test('choosing a flair turns "Add flair" into "Change flair"', async ({ page }) => {
    watch(page, 'a person picking a flair')
    await signIn(page, { plan: 'free' })
    await go(page, '/settings')
    await openSection(page, 'account')
    const row = page.locator('#set-account .settings-row', { has: page.locator('.settings-row-label', { hasText: /^Flair$/ }) })
    await row.getByRole('button', { name: 'Add flair' }).click()
    await row.locator('.flairpick-chip').first().click()
    await expect(row.getByRole('alert')).toHaveCount(0)
    await expect(row.locator('.flairpick-chip').first()).toHaveAttribute('aria-pressed', 'true')
    await row.getByRole('button', { name: 'Done' }).click()
    await expect(page.locator('#set-account').getByRole('button', { name: 'Change flair' })).toBeVisible()
    await expect(page.locator('#set-account').getByRole('button', { name: 'Add flair' })).toHaveCount(0)
  })

  test('an empty profile field says "Not set", never a dash', async ({ page }) => {
    watch(page, 'a person with an empty profile')
    await signIn(page, { plan: 'free' })
    await go(page, '/settings')
    await openSection(page, 'account')
    const profile = page.locator('#set-account').getByRole('group', { name: 'Public profile' })
    for (const label of ['Location', 'Company or studio', 'Website', 'Bio']) {
      const row = profile.locator('.settings-row', { has: page.locator('.settings-row-label', { hasText: new RegExp(`^${label}$`) }) })
      await expect(row.locator('.settings-row-value'), `${label} is not "Not set"`).toHaveText('Not set')
    }
    const values = await page.locator('#set-account .settings-row-value').allInnerTexts()
    expect(values.filter((v) => /^\s*[-–—]\s*$/.test(v)), 'a value is a bare dash').toEqual([])
  })
})

test.describe('settings hierarchy: Bio', () => {
  async function openBio(page) {
    await signIn(page, { plan: 'free' })
    await go(page, '/settings')
    await openSection(page, 'account')
    const section = page.locator('#set-account')
    await section.getByRole('button', { name: 'Edit bio' }).click()
    const bio = section.getByLabel('Bio', { exact: true })
    await expect(bio).toBeVisible()
    return { section, bio }
  }

  test('Bio is a textarea with a live count, and Enter adds a line', async ({ page }) => {
    watch(page, 'a person writing a bio')
    const { section, bio } = await openBio(page)
    expect(await bio.evaluate((el) => el.tagName)).toBe('TEXTAREA')
    expect(await bio.evaluate((el) => el.rows)).toBe(4)
    expect(await bio.evaluate((el) => parseFloat(getComputedStyle(el).minHeight))).toBeGreaterThanOrEqual(96)

    const count = section.locator('.settings-count')
    await expect(count).toContainText('0 / 5,000')
    await bio.pressSequentially('abc')
    await expect(count).toContainText('3 / 5,000')
    await bio.press('Enter')
    await expect(count).toContainText('4 / 5,000')
    await expect(bio, 'Enter saved instead of adding a line').toHaveValue('abc\n')
    await expect(section.getByRole('button', { name: 'Save' })).toBeVisible()

    // The hint names the key for this platform.
    const mod = await page.evaluate(() => (/Mac|iPhone|iPad/.test(navigator.platform || '') ? 'Cmd' : 'Ctrl'))
    await expect(count).toContainText(`${mod}+Enter to save`)
    // Small and quiet: 12px.
    expect(await count.evaluate((el) => getComputedStyle(el).fontSize)).toBe('12px')

    // Escape backs out without saving.
    await bio.press('Escape')
    await expect(section.getByLabel('Bio', { exact: true })).toHaveCount(0)
    await expect(page.getByText('Bio updated')).toHaveCount(0)
  })

  test('Bio saves on Ctrl+Enter and on Cmd+Enter', async ({ page }) => {
    watch(page, 'a person saving a bio from the keyboard')
    const { section, bio } = await openBio(page)
    await bio.fill('I draw type.')
    await bio.press('Control+Enter')
    await expect(page.getByText('Bio updated')).toBeVisible()
    await expect(section.getByLabel('Bio', { exact: true })).toHaveCount(0)
    const row = section.locator('.settings-row', { has: page.locator('.settings-row-label', { hasText: /^Bio$/ }) })
    await expect(row.locator('.settings-row-value')).toHaveText('I draw type.')

    await section.getByRole('button', { name: 'Edit bio' }).click()
    const again = section.getByLabel('Bio', { exact: true })
    await again.fill('I draw type for a living.')
    await again.press('Meta+Enter')
    await expect(row.locator('.settings-row-value')).toHaveText('I draw type for a living.')
    await expect(section.getByLabel('Bio', { exact: true })).toHaveCount(0)
  })
})

test.describe('settings hierarchy: Pro delete list', () => {
  test('a Pro account is told billing stops, with no promise of a refund', async ({ page }) => {
    watch(page, 'a subscriber opening Delete account')
    await signIn(page, { plan: 'pro', subscription: proSub() })
    await go(page, '/settings')
    await openSection(page, 'account')
    const section = page.locator('#set-account')
    await section.getByRole('button', { name: 'Delete account' }).click()
    const list = section.locator('.danger-confirm-list')
    await expect(list).toContainText('Pro is cancelled straight away, and you won’t be billed again.')
    await expect(list).not.toContainText(/refund/i)
    await expect(section.locator('.danger-confirm')).not.toContainText(/refund/i)
  })

  test('a free account is not told anything about Pro', async ({ page }) => {
    watch(page, 'a free account opening Delete account')
    await signIn(page, { plan: 'free' })
    await go(page, '/settings')
    await openSection(page, 'account')
    const section = page.locator('#set-account')
    await section.getByRole('button', { name: 'Delete account' }).click()
    await expect(section.locator('.danger-confirm-list')).toBeVisible()
    await expect(section.locator('.danger-confirm-list')).not.toContainText('Pro is cancelled')
  })
})

test.describe('settings hierarchy: type', () => {
  test('labels use the UI sans in sentence case, not mono capitals', async ({ page }) => {
    watch(page, 'a person reading the settings labels')
    await stubPrices(page)
    await signIn(page, { plan: 'free' })
    await go(page, '/settings')

    await openSection(page, 'account')
    const style = (selector) => page.locator(selector).first().evaluate((el) => {
      const s = getComputedStyle(el)
      return { family: s.fontFamily, transform: s.textTransform, size: s.fontSize, weight: s.fontWeight, text: el.textContent.trim() }
    })
    const label = await style('#set-account .settings-row-label')
    expect(label.family, 'row labels are still mono').not.toMatch(/mono/i)
    expect(label.transform).toBe('none')
    expect(label.size).toBe('13px')
    expect(label.text, 'a row label is still capitals').not.toBe(label.text.toUpperCase())

    const h3 = await style('#set-account .settings-card-h h3')
    expect(h3.family).not.toMatch(/mono/i)
    expect(h3.transform).toBe('none')

    await openSection(page, 'support')
    const tier = await style('#set-support .sub-tier-name')
    expect(tier.family).not.toMatch(/mono/i)
    expect(tier.transform).toBe('none')

    const credit = await style('.stg-credit')
    expect(credit.family, 'the credit line is still mono').not.toMatch(/mono/i)
  })

  test('settings.css holds no raw #fff or rgba()', () => {
    // A source check, kept because a raw colour cannot be seen from a single theme.
    const css = fs.readFileSync(path.join(process.cwd(), 'src', 'styles', 'pages', 'settings.css'), 'utf8')
    expect(css.length, 'the stylesheet was not read').toBeGreaterThan(1000)
    const hits = css.split('\n').map((line, i) => [i + 1, line]).filter(([, line]) => /#fff\b|rgba\(/i.test(line))
    expect(hits, 'raw colours in settings.css').toEqual([])
  })
})

test.describe('settings hierarchy: measure', () => {
  test('at 1440 the content column and every card stop at 720px, and the nav stays 220px', async ({ page }) => {
    watch(page, 'a person on a wide screen')
    await stubPrices(page)
    await signIn(page, { plan: 'pro', subscription: proSub() })
    await go(page, '/settings')

    const width = (selector) => page.locator(selector).first().evaluate((el) => el.getBoundingClientRect().width)
    for (const id of ['account', 'support', 'accessibility', 'language', 'data', 'privacy']) {
      await openSection(page, id)
      expect(await width('.settings-content'), `${id}: the content column`).toBeLessThanOrEqual(720.5)
      const cards = await page.locator(`#set-${id} .settings-card`).evaluateAll((els) => els.map((el) => el.getBoundingClientRect().width))
      expect(cards.length, `${id}: no card found`).toBeGreaterThan(0)
      for (const w of cards) expect(w, `${id}: a card is ${w}px wide`).toBeLessThanOrEqual(720.5)
    }
    // The column is wide enough to be capped, not just narrow.
    expect(await width('.settings-content')).toBeGreaterThanOrEqual(700)
    expect(Math.round(await width('.settings-nav'))).toBe(220)
  })
})

for (const width of [390, 360]) {
  test.describe(`settings hierarchy: a phone at ${width}`, () => {
    test.use({ viewport: { width, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true })

    for (const [plan, subscription] of [['free', undefined], ['pro', proSub()]]) {
      test(`a ${plan} account: no section scrolls sideways and every control is 44px`, async ({ page }) => {
        watch(page, `a ${plan} account on a ${width}px phone`)
        await stubPrices(page)
        await signIn(page, { plan, subscription })
        await go(page, '/settings')

        const sideways = () => page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
        await expect(page.locator('.settings-nav')).toBeVisible()
        expect(await sideways(), 'the section list scrolls sideways').toBeLessThanOrEqual(0)

        const tooSmall = []
        const probe = () => page.evaluate(() => [...document.querySelectorAll('#set-account:not([hidden]) :is(a, button, input, textarea, select, [role="switch"]), .settings-section:not([hidden]) :is(a, button, input, textarea, select, [role="switch"])')]
          .filter((el) => !el.closest('[hidden]') && el.type !== 'hidden' && el.type !== 'file')
          // A link inside a sentence is exempt from the target size.
          .filter((el) => !(el.tagName === 'A' && el.closest('p, li')))
          // The Reduced motion switch draws a 24px track inside a 44px hit area; 174 hit-tests it.
          .filter((el) => el.getAttribute('role') !== 'switch')
          .map((el) => ({ el, r: el.getBoundingClientRect() }))
          .filter(({ r }) => r.width > 0 && r.height > 0)
          .filter(({ r }) => r.height < 43.5 || r.width < 43.5)
          .map(({ el, r }) => `${el.tagName.toLowerCase()} "${(el.getAttribute('aria-label') || el.textContent || el.id || el.className).trim().slice(0, 30)}" ${Math.round(r.width)}x${Math.round(r.height)}`))
        for (const id of ['account', 'support', 'accessibility', 'language', 'data', 'privacy']) {
          await openSection(page, id)
          expect(await sideways(), `${id}: the section scrolls sideways`).toBeLessThanOrEqual(0)
          for (const small of await probe()) tooSmall.push(`${id}: ${small}`)
          await page.getByRole('button', { name: 'All settings' }).click()
        }
        expect(tooSmall, 'controls under 44px').toEqual([])
      })
    }
  })
}

test.describe('settings hierarchy: contrast', () => {
  for (const scheme of ['light', 'dark']) {
    test.describe(scheme, () => {
      test.use({ colorScheme: scheme, locale: 'en-AU', timezoneId: 'UTC' })

      test(`${scheme}: fact labels and values read at 4.5:1 or better`, async ({ page }) => {
        watch(page, `a subscriber reading their plan in ${scheme} mode`)
        await signIn(page, { plan: 'pro', subscription: proSub({ cancelAtPeriodEnd: true }) })
        await go(page, '/settings')
        await expect(page.locator('html')).toHaveAttribute('data-theme', scheme)
        await openSection(page, 'support')

        const ratios = await page.evaluate(() => {
          const canvas = document.createElement('canvas')
          canvas.width = 1
          canvas.height = 1
          const ctx = canvas.getContext('2d', { willReadFrequently: true })
          const parse = (css) => {
            ctx.clearRect(0, 0, 1, 1)
            ctx.fillStyle = '#123456'
            ctx.fillStyle = css
            ctx.fillRect(0, 0, 1, 1)
            const d = ctx.getImageData(0, 0, 1, 1).data
            return d[3] === 0 ? [0, 0, 0, 0] : [d[0], d[1], d[2], d[3] / 255]
          }
          const over = (top, bottom) => {
            const a = top[3] + bottom[3] * (1 - top[3])
            return [0, 1, 2].map((i) => (top[i] * top[3] + bottom[i] * bottom[3] * (1 - top[3])) / (a || 1)).concat(a)
          }
          const backdrop = (el) => {
            const layers = []
            for (let n = el; n; n = n.parentElement) layers.push(parse(getComputedStyle(n).backgroundColor))
            // The page's canvas is the base when nothing opaque sits behind the text.
            return layers.reduceRight((under, layer) => over(layer, under), [...parse(getComputedStyle(document.documentElement).backgroundColor).slice(0, 3), 1])
          }
          const lum = ([r, g, b]) => {
            const f = (c) => { const s = c / 255; return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4 }
            return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b)
          }
          return [...document.querySelectorAll('#set-support .settings-row--fact > .settings-row-label, #set-support .settings-row--fact .settings-row-value, #set-support .sub-ends-note')].map((el) => {
            const bg = backdrop(el)
            const fg = over(parse(getComputedStyle(el).color), bg)
            const [hi, lo] = [lum(fg), lum(bg)].sort((a, b) => b - a)
            return { text: el.textContent.trim().slice(0, 30), ratio: (hi + 0.05) / (lo + 0.05) }
          })
        })
        // POSITIVE CONTROL: the labels, the values and the ends-on note were all measured.
        expect(ratios.length, 'nothing was measured').toBeGreaterThanOrEqual(7)
        for (const { text, ratio } of ratios) expect(ratio, `"${text}" is ${ratio.toFixed(2)}:1 in ${scheme}`).toBeGreaterThanOrEqual(4.5)
      })
    })
  }
})
