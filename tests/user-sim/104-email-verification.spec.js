// EMAIL VERIFICATION — an address the account claims is one it can prove.
//
// Held here:
//   · a password account whose address is unproved is told so in Settings and
//     can send itself a link, which goes to that address;
//   · a link that could not be sent says so, in words;
//   · opening the link elsewhere clears the note when the person comes back to
//     the tab, because the account is re-read rather than remembered;
//   · a verified account is never asked (control);
//   · everywhere else an unverified password account sees a "Verify your email"
//     bar with Resend, which stays out of onboarding and Settings, clears itself
//     when the account is verified, and is never shown to Google or verified
//     accounts;
//   · Resend stays on the bar after a send, counts down a cooldown, and is
//     offered again; focus never drops to the document in any state;
//   · the bar is early in the tab order, straight after the skip link;
//   · the bar keeps one height in every state (54px at 520px and below, 62px
//     above), with the longest address and every refusal, and its Resend and
//     Dismiss reach 44px on a touch screen without growing it;
//   · a keyboard landing on <main> (after Dismiss) draws no page-sized frame;
//   · the link brings the person back to /settings?verified=1, which says
//     "Email verified" only to a signed-in account that the re-read shows
//     verified, tells a signed-out visit the link was opened and offers Sign in,
//     and tells another unverified account that it still is not, including
//     after the sign-in the signed-out toast offers.
import { test, expect } from './base.js'
import { go, watch, signIn } from './helpers.js'

async function openAccount(page) {
  await go(page, '/settings')
  await page.locator('#settab-account').click()
  const section = page.locator('#set-account')
  await expect(section).toBeVisible()
  return section
}

test.describe('settings — email verification', () => {
  test('an unverified account can send itself a link, and it goes to its own address', async ({ page }) => {
    watch(page, 'a person who signed up with a password and has not verified yet')
    const account = await signIn(page, { plan: 'free', emailVerified: false })
    const section = await openAccount(page)
    await expect(section.getByText('Not verified')).toBeVisible()
    await section.getByRole('button', { name: 'Send verification link' }).click()
    await expect(section.getByRole('status')).toContainText(`Link sent to ${account.email}`)
    const mail = await page.evaluate(() => window.__UIL4B_TEST_AUTH__.mail)
    expect(mail).toEqual([{ kind: 'verify-email', to: account.email }])
    // The link asks to come back to Settings; nothing refused it, so no fallback was needed.
    const sends = await page.evaluate(() => window.__UIL4B_TEST_AUTH__.verifySends)
    expect(sends).toEqual([{ withReturn: true, refused: false }])
  })

  test('Settings falls back to the plain link when the return address is refused', async ({ page }) => {
    watch(page, 'a person on a domain the auth console has not authorised yet')
    const account = await signIn(page, { plan: 'free', emailVerified: false, authFail: { sendEmailVerificationWithReturn: 'auth/invalid-continue-uri' } })
    const section = await openAccount(page)
    await section.getByRole('button', { name: 'Send verification link' }).click()
    await expect(section.getByRole('status')).toContainText(`Link sent to ${account.email}`)
    await expect(section.getByRole('alert')).toHaveCount(0)
    const sends = await page.evaluate(() => window.__UIL4B_TEST_AUTH__.verifySends)
    expect(sends).toEqual([{ withReturn: true, refused: true }, { withReturn: false, refused: false }])
  })

  test('a verification link that could not be sent says so', async ({ page }) => {
    watch(page, 'a person who asked for too many links')
    await signIn(page, { plan: 'free', emailVerified: false, authFail: { sendEmailVerification: 'auth/too-many-requests' } })
    const section = await openAccount(page)
    await section.getByRole('button', { name: 'Send verification link' }).click()
    await expect(section.getByRole('alert')).toContainText('Too many links sent')
    await expect(section.getByRole('status')).toHaveCount(0)
  })

  test('opening the link clears the note when the person comes back to the tab', async ({ page }) => {
    watch(page, 'a person who verified in their inbox and came back')
    await signIn(page, { plan: 'free', emailVerified: false })
    const section = await openAccount(page)
    await expect(section.getByText('Not verified')).toBeVisible()
    // The link is opened on the auth server's side; this tab has not seen it.
    await page.evaluate(() => { window.__UIL4B_TEST_AUTH__.account.emailVerified = true })
    await expect(section.getByText('Not verified')).toBeVisible()
    await page.evaluate(() => window.dispatchEvent(new Event('focus')))
    await expect(section.getByText('Not verified')).toHaveCount(0)
    await expect(section.getByRole('button', { name: 'Send verification link' })).toHaveCount(0)
  })

  test('a verified account is never asked (control)', async ({ page }) => {
    watch(page, 'a person whose address is already verified')
    await signIn(page, { plan: 'free' })
    const section = await openAccount(page)
    await expect(section.getByText('Email address', { exact: true })).toBeVisible()
    await expect(section.getByText('Not verified')).toHaveCount(0)
    await expect(section.getByRole('button', { name: 'Send verification link' })).toHaveCount(0)
  })
})

const bar = (page) => page.getByTestId('verify-notice')

test.describe('the "Verify your email" bar', () => {
  test('an unverified password account sees it on an ordinary page, with its address', async ({ page }) => {
    watch(page, 'a person who signed up with a password and went straight to their projects')
    const account = await signIn(page, { plan: 'free', emailVerified: false })
    await go(page, '/projects')
    await expect(bar(page)).toBeVisible()
    await expect(bar(page)).toContainText('Verify your email.')
    await expect(bar(page)).toContainText(account.email)
    await expect(bar(page).getByRole('button', { name: 'Resend link' })).toBeVisible()
  })

  // The label counts down, so find the button by its first word.
  const resendButton = (page) => bar(page).getByRole('button', { name: /^Resend/ })

  test('Resend sends a link to its own address, says so, and stays: cooling down, then offered again', async ({ page }) => {
    watch(page, 'a person who lost the first email')
    await page.clock.install()
    const account = await signIn(page, { plan: 'free', emailVerified: false })
    await go(page, '/projects')
    await resendButton(page).click()
    await expect(bar(page)).toContainText(`Link sent to ${account.email}. Check your inbox and spam folder.`)
    // Still there and still focusable, but not usable until the cooldown ends.
    await expect(resendButton(page)).toHaveAttribute('aria-disabled', 'true')
    await expect(resendButton(page)).toHaveText(/^Resend in \d+s$/)
    // A press during the cooldown sends nothing. Playwright's click treats
    // aria-disabled as not enabled, so press it the way a keyboard user would.
    await resendButton(page).focus()
    await page.keyboard.press('Enter')
    expect(await page.evaluate(() => window.__UIL4B_TEST_AUTH__.mail)).toEqual([{ kind: 'verify-email', to: account.email }])
    await page.clock.fastForward('00:31')
    await expect(resendButton(page)).not.toHaveAttribute('aria-disabled', 'true')
    await expect(resendButton(page)).toHaveText('Resend link')
    await resendButton(page).click()
    await expect.poll(() => page.evaluate(() => window.__UIL4B_TEST_AUTH__.mail.length)).toBe(2)
    await expect(resendButton(page)).toHaveText(/^Resend in \d+s$/)
  })

  test('a keyboard user who pressed Resend stays on Resend through sent and the cooldown', async ({ page }) => {
    watch(page, 'a person who works the bar with the keyboard')
    await page.clock.install()
    await signIn(page, { plan: 'free', emailVerified: false })
    await go(page, '/projects')
    const resend = resendButton(page)
    await resend.focus()
    await expect(resend).toBeFocused()
    await page.keyboard.press('Enter')
    await expect(bar(page)).toContainText('Link sent to')
    await expect(resend).toBeFocused()
    await page.clock.fastForward('00:31')
    await expect(resend).toHaveText('Resend link')
    await expect(resend).toBeFocused()
  })

  test('a failed send leaves focus on Resend, ready to try again', async ({ page }) => {
    watch(page, 'a person whose send was refused')
    await signIn(page, { plan: 'free', emailVerified: false, authFail: { sendEmailVerification: 'auth/too-many-requests' } })
    await go(page, '/projects')
    const resend = resendButton(page)
    await resend.focus()
    await page.keyboard.press('Enter')
    await expect(bar(page).getByRole('alert')).toContainText('Too many links sent')
    await expect(resend).toBeFocused()
    await expect(resend).not.toHaveAttribute('aria-disabled', 'true')
  })

  test('the bar is reached straight after the skip link, before the nav and the page', async ({ page }) => {
    watch(page, 'a person who tabs from the top of the page')
    await signIn(page, { plan: 'free', emailVerified: false })
    await go(page, '/projects')
    await expect(bar(page)).toBeVisible()
    // In the document, the strip comes before the page's main content.
    expect(await page.evaluate(() => {
      const strip = document.querySelector('[data-testid="verify-notice"]')
      const main = document.getElementById('main')
      return !!(strip && main && (strip.compareDocumentPosition(main) & Node.DOCUMENT_POSITION_FOLLOWING))
    })).toBe(true)
    await page.evaluate(() => { document.activeElement?.blur?.(); window.scrollTo(0, 0) })
    await page.keyboard.press('Tab')
    await expect(page.locator('.skip-link')).toBeFocused()
    await page.keyboard.press('Tab')
    await expect(resendButton(page)).toBeFocused()
    await page.keyboard.press('Tab')
    await expect(bar(page).getByRole('button', { name: 'Dismiss verification reminder' })).toBeFocused()
  })

  test('the message is the live region, and a failed send is a separate alert', async ({ page }) => {
    watch(page, 'a person using a screen reader')
    await signIn(page, { plan: 'free', emailVerified: false, authFail: { sendEmailVerification: 'auth/too-many-requests' } })
    await go(page, '/projects')
    // The wrapper holding the buttons is not a live region, or every state change reads the buttons out too.
    await expect(bar(page)).not.toHaveAttribute('role', /.+/)
    await expect(bar(page).getByRole('status')).toContainText('Verify your email.')
    await bar(page).getByRole('button', { name: 'Resend link' }).click()
    await expect(bar(page).getByRole('alert')).toContainText('Too many links sent')
    // Both regions stay in the page and only their text changes: the status one
    // goes quiet, and neither sits inside the other or around the buttons.
    await expect(bar(page).getByRole('status')).toHaveText('')
    expect(await bar(page).evaluate((el) => ({
      nested: !!el.querySelector('[role="status"] [role="alert"], [role="alert"] [role="status"]'),
      aroundButtons: !!el.querySelector('[role="status"] button, [role="alert"] button'),
    }))).toEqual({ nested: false, aroundButtons: false })
  })

  // The hit area is an ::after pad on the button, which boundingBox() cannot see,
  // so ask the page what a thumb would land on, just outside the visible button.
  async function dismissHitsAround(page) {
    const dismiss = bar(page).getByRole('button', { name: 'Dismiss verification reminder' })
    const box = await dismiss.boundingBox()
    return dismiss.evaluate((el, b) => {
      const hit = (x, y) => document.elementFromPoint(x, y) === el
      const midX = b.x + b.width / 2
      const midY = b.y + b.height / 2
      return {
        above: hit(midX, b.y - 8), below: hit(midX, b.y + b.height + 8),
        right: hit(b.x + b.width + 12, midY), left: hit(b.x - 4, midY),
      }
    }, box)
  }

  test('on a phone the Dismiss target is 44px tall without growing the bar', async ({ page }) => {
    watch(page, 'a person tapping Dismiss with a thumb')
    await page.setViewportSize({ width: 390, height: 800 })
    await signIn(page, { plan: 'free', emailVerified: false })
    await go(page, '/projects')
    await expect(bar(page)).toBeVisible()
    expect(await dismissHitsAround(page)).toEqual({ above: true, below: true, right: true, left: true })
  })

  test('on a desktop the Dismiss button keeps its own small footprint (control)', async ({ page }) => {
    watch(page, 'a person with a mouse')
    await page.setViewportSize({ width: 1280, height: 800 })
    await signIn(page, { plan: 'free', emailVerified: false })
    await go(page, '/projects')
    await expect(bar(page)).toBeVisible()
    const hits = await dismissHitsAround(page)
    expect(hits.above).toBe(false)
    expect(hits.below).toBe(false)
  })

  test('a return address Firebase refuses falls back to the plain link, and says it was sent', async ({ page }) => {
    watch(page, 'a person on a domain the auth console has not authorised yet')
    const account = await signIn(page, { plan: 'free', emailVerified: false, authFail: { sendEmailVerificationWithReturn: 'auth/unauthorized-continue-uri' } })
    await go(page, '/projects')
    await bar(page).getByRole('button', { name: 'Resend link' }).click()
    await expect(bar(page)).toContainText(`Link sent to ${account.email}.`)
    // The alert region stays mounted so a later failure is announced; a fall-back that worked leaves it empty.
    await expect(bar(page).getByRole('alert')).toBeEmpty()
    const sends = await page.evaluate(() => window.__UIL4B_TEST_AUTH__.verifySends)
    expect(sends).toEqual([{ withReturn: true, refused: true }, { withReturn: false, refused: false }])
  })

  test('a link that could not be sent says why and keeps the button', async ({ page }) => {
    watch(page, 'a person who asked for too many links')
    await signIn(page, { plan: 'free', emailVerified: false, authFail: { sendEmailVerification: 'auth/too-many-requests' } })
    await go(page, '/projects')
    await bar(page).getByRole('button', { name: 'Resend link' }).click()
    await expect(bar(page).getByRole('alert')).toContainText('Too many links sent')
    await expect(bar(page).getByRole('button', { name: 'Resend link' })).toBeVisible()
  })

  test('dismissing hides it for the visit and returns on the next one', async ({ page }) => {
    watch(page, 'a person who is not ready to deal with it')
    const account = await signIn(page, { plan: 'free', emailVerified: false })
    await go(page, '/projects')
    await bar(page).getByRole('button', { name: 'Dismiss verification reminder' }).click()
    await expect(bar(page)).toHaveCount(0)
    const key = `vs-verify-dismissed:${account.uid}`
    expect(await page.evaluate((k) => sessionStorage.getItem(k), key)).toBe('1')
    // Focus is handed to the page, not dropped.
    await expect(page.locator('#main')).toBeFocused()
    // Same visit: it stays away. A new visit has no session storage: it is back.
    await go(page, '/projects')
    await expect(bar(page)).toHaveCount(0)
    await page.evaluate((k) => sessionStorage.removeItem(k), key)
    await go(page, '/projects')
    await expect(bar(page)).toBeVisible()
  })

  test('it stays out of Settings, where the Email row already offers the link', async ({ page }) => {
    watch(page, 'a person looking at their account')
    await signIn(page, { plan: 'free', emailVerified: false })
    await go(page, '/settings')
    await expect(page.locator('#settab-account')).toBeVisible()
    await expect(bar(page)).toHaveCount(0)
  })

  test('it stays out of onboarding, and onboarding does not claim a link it did not send', async ({ page }) => {
    watch(page, 'a person resuming onboarding they had left')
    await signIn(page, { plan: 'free', emailVerified: false, onboarded: false })
    await go(page, '/onboarding')
    await expect(page.getByTestId('onboarding-first-win')).toBeVisible()
    await expect(bar(page)).toHaveCount(0)
    // The "check your inbox" line belongs to the session that signed up.
    await expect(page.getByTestId('onboarding-verify-line')).toHaveCount(0)
  })

  test('a verified account never sees it (control)', async ({ page }) => {
    watch(page, 'a person whose address is already verified')
    await signIn(page, { plan: 'free' })
    await go(page, '/projects')
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    await expect(bar(page)).toHaveCount(0)
  })

  test('a Google account never sees it, whatever its flag says', async ({ page }) => {
    watch(page, 'a person who signed in with Google')
    await signIn(page, { plan: 'free', emailVerified: false })
    // The declaration is re-read on every load; this one runs after signIn's.
    await page.addInitScript(() => {
      window.__UIL4B_TEST_SESSION__ = { ...window.__UIL4B_TEST_SESSION__, provider: 'google.com' }
    })
    await go(page, '/projects')
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    await expect(bar(page)).toHaveCount(0)
  })

  test('verifying elsewhere clears it when the person comes back to the tab', async ({ page }) => {
    watch(page, 'a person who opened the link in their inbox and returned')
    await signIn(page, { plan: 'free', emailVerified: false })
    await go(page, '/projects')
    await expect(bar(page)).toBeVisible()
    await page.evaluate(() => { window.__UIL4B_TEST_AUTH__.account.emailVerified = true })
    await page.evaluate(() => window.dispatchEvent(new Event('focus')))
    await expect(bar(page)).toContainText('Email verified.')
    await expect(bar(page)).toHaveCount(0, { timeout: 8000 })
  })

  test('focus on the bar when it takes itself away goes to the page, not the document', async ({ page }) => {
    watch(page, 'a keyboard user on the bar when the address gets verified')
    await signIn(page, { plan: 'free', emailVerified: false })
    await go(page, '/projects')
    const resend = resendButton(page)
    await resend.focus()
    await page.evaluate(() => { window.__UIL4B_TEST_AUTH__.account.emailVerified = true })
    await page.evaluate(() => window.dispatchEvent(new Event('focus')))
    await expect(bar(page)).toContainText('Email verified.')
    // Resend goes with the unverified state; its focus moves to Dismiss.
    await expect(resend).toHaveCount(0)
    await expect(bar(page).getByRole('button', { name: 'Dismiss verification reminder' })).toBeFocused()
    // And when the bar clears itself, the page takes it.
    await expect(bar(page)).toHaveCount(0, { timeout: 8000 })
    await expect(page.locator('#main')).toBeFocused()
  })
})

// A bar that persists keeps one height: 54px at 520px and below, 62px above,
// in every state it can be in, whatever the address or the refusal says. A
// message that would need a third line is clipped to two rather than growing
// the bar, so the check is that nothing is cut off either.
const LONG_ADDRESS = `${'a'.repeat(51)}@uil4b.test` // 62 characters
const HEIGHT_AT = [[390, 54], [768, 62], [1440, 62]]

async function expectBarHeight(page, want, what) {
  const m = await bar(page).evaluate((el) => {
    const msg = el.querySelector('.sync-notice-msg')
    return { height: el.getBoundingClientRect().height, clipped: msg.scrollHeight > msg.clientHeight + 1 }
  })
  expect(Math.abs(m.height - want), `${what}: the bar is ${m.height}px, not ${want}px`).toBeLessThanOrEqual(1)
  expect(m.clipped, `${what}: the message is cut off`).toBe(false)
}

// What a thumb lands on just outside the visible Dismiss button.
async function dismissReach(page) {
  const dismiss = bar(page).getByRole('button', { name: 'Dismiss verification reminder' })
  const box = await dismiss.boundingBox()
  return dismiss.evaluate((el, b) => {
    const hit = (x, y) => document.elementFromPoint(x, y) === el
    const midX = b.x + b.width / 2
    const midY = b.y + b.height / 2
    return {
      above: hit(midX, b.y - 8), below: hit(midX, b.y + b.height + 8),
      right: hit(b.x + b.width + 12, midY), left: hit(b.x - 4, midY),
    }
  }, box)
}

test.describe('the "Verify your email" bar keeps one height', () => {
  for (const [width, want] of HEIGHT_AT) {
    test(`at ${width}px it is ${want}px idle, sent and verified, with a 62-character address`, async ({ page }) => {
      watch(page, 'a person watching the page under a bar that must not move')
      await page.setViewportSize({ width, height: 900 })
      await signIn(page, { plan: 'free', emailVerified: false, email: LONG_ADDRESS })
      await go(page, '/projects')
      await expect(bar(page)).toBeVisible()
      await expectBarHeight(page, want, 'idle')
      await bar(page).getByRole('button', { name: 'Resend link' }).click()
      await expect(bar(page)).toContainText('Link sent')
      await expectBarHeight(page, want, 'sent, cooling down')
      await expect(bar(page).getByRole('button', { name: /^Resend/ })).toHaveText(/^Resend in \d+s$/)
      await page.evaluate(() => { window.__UIL4B_TEST_AUTH__.account.emailVerified = true })
      await page.evaluate(() => window.dispatchEvent(new Event('focus')))
      await expect(bar(page)).toContainText('Email verified.')
      await expectBarHeight(page, want, 'verified')
    })

    for (const code of ['auth/too-many-requests', 'auth/network-request-failed', 'auth/internal-error']) {
      test(`at ${width}px a refusal (${code}) leaves it ${want}px, with a 62-character address`, async ({ page }) => {
        watch(page, 'a person whose send was refused')
        await page.setViewportSize({ width, height: 900 })
        await signIn(page, { plan: 'free', emailVerified: false, email: LONG_ADDRESS, authFail: { sendEmailVerification: code } })
        await go(page, '/projects')
        await bar(page).getByRole('button', { name: 'Resend link' }).click()
        await expect(bar(page).getByRole('alert')).not.toBeEmpty()
        await expectBarHeight(page, want, `failed (${code})`)
      })
    }
  }

  test('on a phone the sent line leaves the address out; wider, it keeps it', async ({ page }) => {
    watch(page, 'a person reading the sent line on two screens')
    const account = await signIn(page, { plan: 'free', emailVerified: false })
    await page.setViewportSize({ width: 390, height: 800 })
    await go(page, '/projects')
    await bar(page).getByRole('button', { name: 'Resend link' }).click()
    await expect(bar(page)).toContainText('Link sent')
    await expect(bar(page).getByRole('status')).toHaveText('Link sent. Check your inbox and spam folder.', { useInnerText: true })
    await page.setViewportSize({ width: 1280, height: 800 })
    await expect(bar(page).getByRole('status')).toHaveText(`Link sent to ${account.email}. Check your inbox and spam folder.`, { useInnerText: true })
  })
})

// A tablet is a touch screen above 520px: Resend and Dismiss reach 44px there
// too, through an ::after pad, and the bar stays 62px.
test.describe('the "Verify your email" bar on a touch tablet', () => {
  test.use({ hasTouch: true, isMobile: true, viewport: { width: 768, height: 1024 } })

  test('Resend and Dismiss reach 44px without growing the bar or meeting each other', async ({ page }) => {
    watch(page, 'a person tapping the bar on a tablet')
    await signIn(page, { plan: 'free', emailVerified: false })
    await go(page, '/projects')
    await expect(bar(page)).toBeVisible()
    expect(await page.evaluate(() => matchMedia('(pointer: coarse)').matches)).toBe(true)
    await expectBarHeight(page, 62, 'idle on a tablet')
    const resend = bar(page).getByRole('button', { name: 'Resend link' })
    const rBox = await resend.boundingBox()
    const reach = await resend.evaluate((el, b) => {
      const hit = (x, y) => document.elementFromPoint(x, y) === el
      const midX = b.x + b.width / 2
      return { above: hit(midX, b.y - 6), below: hit(midX, b.y + b.height + 6) }
    }, rBox)
    expect(reach).toEqual({ above: true, below: true })
    expect(await dismissReach(page)).toEqual({ above: true, below: true, right: true, left: true })
    // Dismiss's pad does not reach into Resend.
    const dBox = await bar(page).getByRole('button', { name: 'Dismiss verification reminder' }).boundingBox()
    expect(dBox.x).toBeGreaterThanOrEqual(rBox.x + rBox.width)
  })
})

test.describe('a keyboard landing on the page', () => {
  for (const width of [390, 1440]) {
    test(`at ${width}px, Dismiss by keyboard hands focus to <main> with no page-sized frame`, async ({ page }) => {
      watch(page, 'a keyboard user who dismissed the bar')
      await page.setViewportSize({ width, height: 900 })
      await signIn(page, { plan: 'free', emailVerified: false })
      await go(page, '/projects')
      await bar(page).getByRole('button', { name: 'Dismiss verification reminder' }).focus()
      await page.keyboard.press('Enter')
      await expect(bar(page)).toHaveCount(0)
      const landed = await page.evaluate(() => {
        const main = document.getElementById('main')
        return { onMain: document.activeElement === main, outline: getComputedStyle(main).outlineStyle }
      })
      expect(landed).toEqual({ onMain: true, outline: 'none' })
    })
  }
})

test.describe('coming back from the link', () => {
  const toast = (page) => page.locator('.toast.show')
  // "No toast" must be read once, now. `toHaveCount(0)` retries until the count
  // IS zero, and a toast hides itself after a few seconds, so it would pass on
  // a toast that did appear (seen: the unverified-account mutation stayed green).
  const expectNoToast = async (page) => {
    await page.evaluate(() => new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done))))
    expect(await toast(page).count()).toBe(0)
  }

  test('a verified account lands on its Account section with a toast, and the address is tidied', async ({ page }) => {
    watch(page, 'a person who clicked the link in the same browser')
    await signIn(page, { plan: 'free', emailVerified: true })
    await go(page, '/settings?verified=1')
    await expect(page.locator('#set-account')).toBeVisible()
    await expect(toast(page)).toContainText('Email verified')
    await expect(page).toHaveURL(/\/settings\/?$/)
  })

  test('the parameter is removed, so a reload does not say it twice', async ({ page }) => {
    watch(page, 'a person who reloaded after the link')
    await signIn(page, { plan: 'free', emailVerified: true })
    await go(page, '/settings?verified=1')
    await expect(toast(page)).toContainText('Email verified')
    await expect(page).toHaveURL(/\/settings\/?$/)
    await go(page, '/settings')
    await expect(page.locator('#settab-account')).toBeVisible()
    await expectNoToast(page)
  })

  test('signed out, it says the link was opened and offers Sign in, and claims nothing', async ({ page }) => {
    watch(page, 'a person who opened the link on a device they are not signed in on')
    await go(page, '/settings?verified=1')
    await expect(page).toHaveURL(/\/settings\/?$/)
    await expect(toast(page)).toContainText('Your email link was opened. Sign in to finish.')
    await expect(toast(page)).not.toContainText('verified')
    await expect(page.getByText('Email verified')).toHaveCount(0)
    // The action opens the sign-in dialog over the page.
    await toast(page).getByRole('button', { name: 'Sign in' }).click()
    await expect(page.locator('#ui-login-title')).toBeVisible()
  })

  test('an account the link did not verify is told so plainly', async ({ page }) => {
    watch(page, 'a person signed in as a different, still unverified account')
    await signIn(page, { plan: 'free', emailVerified: false })
    await go(page, '/settings?verified=1')
    await expect(page.locator('#set-account')).toBeVisible()
    await expect(page).toHaveURL(/\/settings\/?$/)
    await expect(page.locator('#set-account').getByText('Not verified')).toBeVisible()
    await expect(toast(page)).toContainText("This account still isn't verified")
    await expect(toast(page)).not.toContainText('Email verified')
    await expect(toast(page).getByRole('button', { name: 'Sign in' })).toHaveCount(0)
  })

  // The person signs in through the popup's own form, so the promise the Sign in
  // action is waiting on settles the way it does in life.
  async function signInThroughPopup(page) {
    await page.locator('#ui-login-email').fill('someone@uil4b.test')
    await page.locator('#ui-login-password').fill('a-long-password')
    await page.locator('form.auth-form button[type="submit"]').click()
  }

  // "Sign in to finish" has to finish: the sign-in lands on the Account section,
  // the account is read again, and the answer is said.
  for (const width of [390, 1280]) {
    test(`at ${width}px, signing in from the signed-out toast says "Email verified"`, async ({ page }) => {
      watch(page, 'a person who opened the link on another device, then signed in here')
      await page.setViewportSize({ width, height: 900 })
      await signIn(page, { plan: 'free', emailVerified: true, lateSignIn: true })
      await go(page, '/settings?verified=1')
      await toast(page).getByRole('button', { name: 'Sign in' }).click()
      await expect(page.locator('#ui-login-title')).toBeVisible()
      await signInThroughPopup(page)
      await expect(page.locator('#set-account')).toBeVisible()
      await expect(toast(page)).toContainText('Email verified')
    })
  }

  test('signing in from the signed-out toast as an unverified account says it still is not', async ({ page }) => {
    watch(page, 'a person who signed in as an account the link did not verify')
    await signIn(page, { plan: 'free', emailVerified: false, lateSignIn: true })
    await go(page, '/settings?verified=1')
    await toast(page).getByRole('button', { name: 'Sign in' }).click()
    await expect(page.locator('#ui-login-title')).toBeVisible()
    await signInThroughPopup(page)
    await expect(page.locator('#set-account')).toBeVisible()
    await expect(toast(page)).toContainText("This account still isn't verified")
    await expect(toast(page)).not.toContainText('Email verified')
  })
})
