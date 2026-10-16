// ONBOARDING FOLLOWS THE ACCOUNT RECORD.
//
// Whether a signed-in person owes onboarding is read from their profile
// document: an open `onboarding` record with no completedAt means owed; a
// completedAt means done; no record at all means an account from before the
// record existed, which is never sent back. This browser's `vs-onboarded` flag
// only speeds up an answer the account already gave.
//
// Every route the app commits is stamped on <html data-route>, so recording
// those stamps shows whether /onboarding was ever painted, not only where the
// visit ended.
//
// The test double answers the profile read before `/` makes its first
// decision, so the "finished account" cases pin the end state only. The order
// of events during a slow read (a default profile must not deny completion) is
// pinned by tests/unit/onboarding-once.test.js.
import { test, expect } from './base.js'
import { go, watch, signIn } from './helpers.js'
import { SIGNED_IN_HOME } from '../../src/utils/onboardingState.js'

const UID = 'test-uid-free'
const EMAIL = 'free.user@uil4b.test'

function accountDoc(onboarding) {
  return {
    [`users/${UID}`]: {
      displayName: 'Freya Free', email: EMAIL, photoURL: '', location: '', website: '',
      bio: '', company: '', flair: '',
      ...(onboarding ? { onboarding } : {}),
    },
  }
}

async function recordRoutes(page) {
  await page.addInitScript(() => {
    window.__routes = []
    new MutationObserver(() => {
      const r = document.documentElement?.dataset.route
      if (r && window.__routes[window.__routes.length - 1] !== r) window.__routes.push(r)
    }).observe(document, { attributes: true, subtree: true, attributeFilter: ['data-route'] })
  })
}

const routes = (page) => page.evaluate(() => window.__routes || [])
const flag = (page) => page.evaluate(() => localStorage.getItem('vs-onboarded'))

// The account's profile read has resolved once AuthContext has mirrored it or
// the user home has painted; both are waited on explicitly below.
async function settleOn(page, path) {
  await expect(page).toHaveURL(new RegExp(`${path}/?$`))
  await expect.poll(() => page.evaluate(() => document.documentElement.dataset.route)).toBe(path)
}

test.describe('onboarding is decided by the account record', () => {
  for (const returning of [false, true]) {
    test(`a finished account on a browser that never saw it goes home without painting onboarding (hint ${returning ? 'set' : 'absent'})`, async ({ page }) => {
      watch(page, 'an established account on a new device')
      await recordRoutes(page)
      await signIn(page, {
        plan: 'free', onboarded: false, returning, uid: UID, email: EMAIL,
        docs: accountDoc({ completedAt: Date.now() - 30 * 86_400_000 }),
      })
      await go(page, '/')
      await settleOn(page, SIGNED_IN_HOME)
      await expect.poll(() => flag(page), 'the account completion was never mirrored locally').toBe('1')
      expect(await routes(page), 'onboarding was painted for a finished account').not.toContain('/onboarding')
      await expect(page.getByTestId('onboarding-first-win')).toHaveCount(0)
    })
  }

  // A SLOW ACCOUNT READ, FROM A BROWSER THAT HAS NEVER SEEN THIS PERSON.
  //
  // Empty localStorage apart from the session hint a returning visitor has, no
  // `vs-onboarded`, and a profile read that answers after SLOW_MS. Until it
  // answers the app only holds a default profile, which carries no record and
  // so must not be taken for "owes onboarding". The read is proved still
  // pending by the missing local mirror, so the assertion is about the wait and
  // not about a read that happened to be quick.
  const SLOW_MS = 4000
  const slow = [{ path: `users/${UID}`, ms: SLOW_MS }]

  for (const target of [SIGNED_IN_HOME, '/', '/create/palette']) {
    test(`a finished account on a fresh browser asking for ${target} is never shown onboarding while its profile is slow`, async ({ page }) => {
      watch(page, 'an established account, new device, slow profile read')
      await recordRoutes(page)
      await signIn(page, {
        plan: 'free', onboarded: false, returning: true, uid: UID, email: EMAIL,
        docs: accountDoc({ completedAt: Date.now() - 30 * 86_400_000 }),
        slowReads: slow,
      })
      await go(page, target)
      // The visit is on screen and the account has not answered yet.
      expect(await flag(page), 'the profile had already answered, so the wait was not exercised').toBeNull()
      const expected = target === '/' ? SIGNED_IN_HOME : target
      await settleOn(page, expected)
      expect(await routes(page), 'onboarding was painted while the account had not answered').not.toContain('/onboarding')
      // Now let the read land and confirm the answer does not undo the above.
      await expect.poll(() => flag(page), 'the account completion was never mirrored locally', { timeout: SLOW_MS * 3 }).toBe('1')
      await page.waitForTimeout(300)
      expect(await routes(page), 'onboarding was painted after the account answered').not.toContain('/onboarding')
      await expect(page).toHaveURL(new RegExp(`${expected}/?$`))
      await expect(page.getByTestId('onboarding-first-win')).toHaveCount(0)
    })
  }

  test('the same slow read does not hide an account that owes onboarding: it is sent once the account answers', async ({ page }) => {
    // The other half of the guard above. If every account were waved through
    // regardless of its record, the cases above would pass; this one would not.
    watch(page, 'a new account on a new device, slow profile read')
    await recordRoutes(page)
    await signIn(page, {
      plan: 'free', onboarded: false, returning: true, uid: UID, email: EMAIL,
      docs: accountDoc({ openedAt: Date.now() - 86_400_000 }),
      slowReads: slow,
    })
    await go(page, '/')
    expect(await flag(page)).toBeNull()
    await settleOn(page, '/onboarding')
    await expect(page.getByTestId('onboarding-first-win')).toBeVisible()
  })

  test('an account from before the record existed is not sent to onboarding', async ({ page }) => {
    watch(page, 'a long-standing account with no onboarding record, new device')
    await recordRoutes(page)
    await signIn(page, {
      plan: 'free', onboarded: false, returning: false, uid: UID, email: EMAIL,
      docs: accountDoc(null),
    })
    await go(page, '/')
    await settleOn(page, SIGNED_IN_HOME)
    // The home is on screen; give the profile read and the resume check the
    // chance to act, then confirm neither moved the visitor.
    await page.waitForFunction(() => document.querySelector('main')?.innerText.length > 0)
    await page.waitForTimeout(500)
    expect(await routes(page)).not.toContain('/onboarding')
    await expect(page).toHaveURL(new RegExp(`${SIGNED_IN_HOME}/?$`))
  })

  test('a profile read that fails leaves the account alone and writes nothing', async ({ page }) => {
    // Offline, or a refused read: the account did not answer, which is not the
    // same as having no profile document. Nothing may open an onboarding
    // record or write a default profile over the real one.
    watch(page, 'an established account whose profile read fails')
    await recordRoutes(page)
    await signIn(page, {
      plan: 'free', onboarded: false, returning: true, uid: UID, email: EMAIL,
      docs: accountDoc(null),
      deny: [{ path: `users/${UID}`, ops: ['get'], code: 'unavailable' }],
    })
    await go(page, '/')
    await settleOn(page, SIGNED_IN_HOME)
    await page.waitForFunction(() => document.querySelector('main')?.innerText.length > 0)
    await page.waitForTimeout(500)
    expect(await routes(page), 'a failed read sent the account to onboarding').not.toContain('/onboarding')
    await expect(page).toHaveURL(new RegExp(`${SIGNED_IN_HOME}/?$`))
    const stored = await page.evaluate((path) => window.__UIL4B_TEST_STORE__.get(path), `users/${UID}`)
    expect(stored.onboarding, 'a failed read opened an onboarding record on the account').toBeUndefined()
    expect(stored.displayName).toBe('Freya Free')
  })

  test('an account that opened onboarding and left resumes it from the signed-in home', async ({ page }) => {
    watch(page, 'a new account coming back after abandoning onboarding')
    await recordRoutes(page)
    await signIn(page, {
      plan: 'free', onboarded: false, returning: true, uid: UID, email: EMAIL,
      docs: accountDoc({ openedAt: Date.now() - 86_400_000 }),
    })
    await go(page, '/')
    await settleOn(page, '/onboarding')
    await expect(page.getByTestId('onboarding-first-win')).toBeVisible()
  })

  test('an unfinished account opening the signed-in home directly resumes onboarding', async ({ page }) => {
    // The address the account menu, a bookmark and sign-in all lead to. `/`
    // decides before this page is reached; this is the home deciding for itself.
    watch(page, 'a new account returning straight to its home')
    await signIn(page, {
      plan: 'free', onboarded: false, returning: true, uid: UID, email: EMAIL,
      docs: accountDoc({ openedAt: Date.now() - 86_400_000 }),
    })
    await go(page, SIGNED_IN_HOME)
    await settleOn(page, '/onboarding')
    await expect(page.getByTestId('onboarding-first-win')).toBeVisible()
  })

  test('the same unfinished account is left alone on the sales page and on a deep link', async ({ page }) => {
    watch(page, 'an unfinished account following a link')
    await recordRoutes(page)
    await signIn(page, {
      plan: 'free', onboarded: false, returning: true, uid: UID, email: EMAIL,
      docs: accountDoc({ openedAt: Date.now() - 86_400_000 }),
    })
    for (const path of ['/home', '/create/palette']) {
      await go(page, path)
      await settleOn(page, path)
      await page.waitForTimeout(500)
      await expect(page).toHaveURL(new RegExp(`${path}/?$`))
      // The recorder starts over on every document, so check each visit.
      expect(await routes(page), `${path} was re-routed`).not.toContain('/onboarding')
    }
  })
})
