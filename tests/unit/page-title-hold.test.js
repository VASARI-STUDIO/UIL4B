// The tab title has one owner, the route effect. A page that must set its own
// title holds it through holdPageTitle; the route effect asks resolveRouteTitle
// for what to write, and a release puts the route's title back.
import test from 'node:test'
import assert from 'node:assert/strict'
import { holdPageTitle, resolveRouteTitle } from '../../src/utils/pageTitle.js'
import { footerShowsOn } from '../../src/components/nav/footerRoutes.js'

globalThis.document = { title: '' }

test('the route title is shown when no page holds one', () => {
  assert.equal(resolveRouteTitle('UI L4B | Privacy'), 'UI L4B | Privacy')
})

test('a held title wins over the route title, including on later route changes', () => {
  resolveRouteTitle('UI L4B | Project')
  const release = holdPageTitle('UI L4B | Project not found')
  assert.equal(document.title, 'UI L4B | Project not found')
  assert.equal(resolveRouteTitle('UI L4B | Project'), 'UI L4B | Project not found')
  assert.equal(resolveRouteTitle('UI L4B | Other'), 'UI L4B | Project not found')
  release()
})

test('releasing the hold puts the latest route title back', () => {
  resolveRouteTitle('UI L4B | Project')
  const release = holdPageTitle('UI L4B | Project not found')
  resolveRouteTitle('UI L4B | Plans')
  release()
  assert.equal(document.title, 'UI L4B | Plans')
  assert.equal(resolveRouteTitle('UI L4B | Plans'), 'UI L4B | Plans')
})

test('a release that was already replaced by a newer hold changes nothing', () => {
  const first = holdPageTitle('First')
  const second = holdPageTitle('Second')
  first()
  assert.equal(document.title, 'Second')
  assert.equal(resolveRouteTitle('Route'), 'Second')
  second()
  assert.equal(resolveRouteTitle('Route'), 'Route')
})

test('the expired-link address wears the site footer, whatever the case or trailing slash', () => {
  for (const path of ['/reset-password', '/reset-password/', '/RESET-PASSWORD']) {
    assert.equal(footerShowsOn(path), true, path)
  }
  assert.equal(footerShowsOn('/settings'), false)
})
