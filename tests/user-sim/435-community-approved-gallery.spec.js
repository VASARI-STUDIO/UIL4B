// APPROVED COMMUNITY WORK REACHES THE LIBRARIES.
//
// A reviewer approving a gradient or a palette flips `status` on the queue
// document. The Gradient and Palette Libraries read approved documents back and
// show them as Community rows, open at every tier; pending and rejected ones
// never appear there. On the member's own profile, Your submissions lists what
// is still waiting or was turned down, and drops what was approved; the Made tab lists that approved work instead.
//
// The queue is seeded as 290-community-status-withdraw.spec.js seeds it.
import { test, expect } from './base.js'
import { go, watch, signIn } from './helpers.js'

const base = {
  authorUid: 'test-uid-free',
  authorName: 'Freya Free',
  createdAt: '2026-10-20T09:00:00.000Z',
}

const gradientDoc = (over = {}) => ({
  ...base,
  kind: 'gradient',
  name: 'Harbour Dusk',
  status: 'approved',
  payload: { type: 'linear', angle: 135, stops: [{ color: '#1E3A8A', position: 0 }, { color: '#F97316', position: 100 }] },
  ...over,
})

const paletteDoc = (over = {}) => ({
  ...base,
  kind: 'palette',
  name: 'Tidepool Set',
  status: 'approved',
  payload: { colors: ['#0F766E', '#14B8A6', '#F0FDFA', '#134E4A'], category: 'Brand', author: 'Freya Free' },
  ...over,
})

const docs = {
  'community-submissions/g-ok': gradientDoc(),
  'community-submissions/g-wait': gradientDoc({ name: 'Waiting Gradient', status: 'pending', createdAt: '2026-10-21T09:00:00.000Z' }),
  'community-submissions/p-ok': paletteDoc(),
  'community-submissions/p-no': paletteDoc({ name: 'Turned Down Palette', status: 'rejected' }),
}

const results = (page) => page.locator('section.lib-results')

test.describe('community · approved work in the libraries', () => {
  test('an approved gradient joins the Gradient Library and a pending one does not', async ({ page }) => {
    watch(page, 'a member with one approved and one pending gradient')
    await signIn(page, { plan: 'free', docs })
    await go(page, '/discover/gradients')

    await expect(results(page).getByText('Harbour Dusk').first(),
      'an approved gradient must appear in the library').toBeVisible({ timeout: 15000 })
    await expect(results(page).getByText('By Freya Free · 2 stops').first(),
      'a community gradient names its maker under its name').toBeVisible()
    await expect(results(page).getByText('Waiting Gradient'),
      'a pending gradient must not appear in the library').toHaveCount(0)
  })

  test('an approved palette joins the Palette Library and a rejected one does not', async ({ page }) => {
    watch(page, 'a member with one approved and one rejected palette')
    await signIn(page, { plan: 'free', docs })
    await go(page, '/discover/palettes')

    await expect(results(page).getByText('Tidepool Set').first(),
      'an approved palette must appear in the library').toBeVisible({ timeout: 15000 })
    await expect(results(page).getByText('By Freya Free · 4 colours').first(),
      'a community palette names its maker under its name').toBeVisible()
    await expect(results(page).getByText('Turned Down Palette'),
      'a rejected palette must not appear in the library').toHaveCount(0)
  })

  test('Your submissions keeps pending and rejected work; approved work moves to Made', async ({ page }) => {
    watch(page, 'a member reading their own queue')
    await signIn(page, {
      plan: 'free',
      docs: {
        'community-submissions/p-ok': paletteDoc(),
        'community-submissions/g-ok': gradientDoc({ createdAt: '2026-10-19T09:00:00.000Z' }),
        'community-submissions/p-no': paletteDoc({ name: 'Turned Down Palette', status: 'rejected' }),
        'community-submissions/d-wait': {
          ...base,
          kind: 'design',
          name: 'Waiting Design',
          status: 'pending',
          payload: { author: 'Freya Free', category: 'Dashboard', url: 'https://example.com/w', c1: '#3B82F6', c2: '#8B5CF6' },
        },
      },
    })
    await go(page, '/u/me#your-submissions')
    const queued = page.locator('#your-submissions')
    await expect(page.getByRole('heading', { level: 2, name: 'Your submissions' })).toBeVisible()

    await expect(queued.locator('.cm-sub', { hasText: 'Waiting Design' }),
      'a pending design stays in Your submissions').toHaveCount(1)
    await expect(queued.locator('.cm-sub', { hasText: 'Turned Down Palette' }),
      'a rejected palette stays in Your submissions').toHaveCount(1)
    await expect(queued.locator('.cm-sub', { hasText: 'Tidepool Set' }),
      'an approved palette has joined the library and leaves Your submissions').toHaveCount(0)

    const made = page.locator('#cm-tabpanel')
    await expect(made.getByRole('list', { name: 'Approved work' }).getByText('Tidepool Set'),
      "the approved palette is listed under Made on the owner's profile").toBeVisible()
    await expect(made.getByRole('list', { name: 'Approved work' }).getByText('Harbour Dusk'),
      "the approved gradient is listed under Made too").toBeVisible()
    await expect(page.locator('.cm-p-head .cm-sample-line'),
      'the header counts waiting, turned-down and approved work').toContainText('4 submissions')
    await made.getByRole('listitem').filter({ hasText: 'Tidepool Set' }).getByRole('link', { name: 'See in library' }).click()
    await expect(page).toHaveURL(/\/discover\/palettes/)
    await expect(results(page).getByText('Tidepool Set').first(),
      'the link opens the library that now holds it').toBeVisible({ timeout: 15000 })
  })
})
