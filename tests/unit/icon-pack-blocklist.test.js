// SETS WE NEVER SHOW OR EXPORT, AND ICONS A PACK KEEPS FOR PRO.
//
// The block-list lives in src/data/iconPackTiers.js and is read by canSeePack,
// which every browse, search result and group-export plan asks. A set on it must
// be refused at EVERY tier, Pro included: Pro search is unscoped, so without this
// it is the one path that reaches the sets whose own terms restrict this use.
import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  BLOCKED_PACKS, ICON_PACK_TIERS, canSeeIcon, canSeePack, isBlockedPack, isProOnlyIcon,
  proOnlyIconCount, visibleIconNames,
} from '../../src/data/iconPackTiers.js'

// Every Iconify streamline prefix on 2026-10-28 (api.iconify.design/collections).
const STREAMLINE = [
  'streamline', 'streamline-ultimate', 'streamline-plump', 'streamline-sharp', 'streamline-cyber',
  'streamline-pixel', 'streamline-block', 'streamline-freehand', 'streamline-flex',
  'streamline-ultimate-color', 'streamline-plump-color', 'streamline-freehand-color',
  'streamline-kameleon-color', 'streamline-stickies-color', 'streamline-color', 'streamline-flex-color',
  'streamline-sharp-color', 'streamline-cyber-color', 'streamline-logos', 'streamline-emojis',
]

test('Remix Icon and every Streamline prefix are blocked, and nothing else is caught by accident', () => {
  assert.equal(isBlockedPack('ri'), true)
  for (const p of STREAMLINE) assert.equal(isBlockedPack(p), true, `${p} must be blocked`)
  assert.equal(isBlockedPack('STREAMLINE-FLEX'), true, 'prefix case does not matter')
  // Look-alikes: a prefix that merely starts with the same letters is a different set.
  for (const p of ['rix', 'ri-fill', 'stream', 'streamlineish', 'lucide', 'mingcute', 'carbon', '', undefined, null]) {
    assert.equal(isBlockedPack(p), false, `${String(p)} must not be blocked`)
  }
})

test('a blocked set is refused at every tier, Pro included, and is not in the tier table', () => {
  for (const p of ['ri', ...STREAMLINE]) {
    for (const tier of ['anon', 'free', 'paid']) {
      assert.equal(canSeePack(p, tier), false, `${p} must be refused for ${tier}`)
      assert.equal(canSeeIcon(p, 'home', tier), false, `${p}:home must be refused for ${tier}`)
    }
  }
  for (const p of Object.keys(ICON_PACK_TIERS)) {
    assert.equal(isBlockedPack(p), false, `${p} is in the tier table and on the block-list`)
  }
  // An unlisted, unblocked set still reaches Pro search, as before.
  assert.equal(canSeePack('some-unlisted-set', 'paid'), true)
  assert.ok(BLOCKED_PACKS.exact.includes('ri') && BLOCKED_PACKS.families.includes('streamline'))
})

test('MingCute and Carbon are free-tier packs; Carbon keeps logo-* for Pro', () => {
  for (const p of ['mingcute', 'carbon']) {
    assert.equal(ICON_PACK_TIERS[p].tier, 'free')
    assert.equal(canSeePack(p, 'anon'), false)
    assert.equal(canSeePack(p, 'free'), true)
  }
  const names = ['home', 'logo-github', 'logo-x', 'logout', 'settings']
  assert.equal(isProOnlyIcon('carbon', 'logo-github'), true)
  assert.equal(isProOnlyIcon('carbon', 'logout'), false, 'logout is not a brand mark')
  assert.equal(isProOnlyIcon('mingcute', 'logo-github'), false, 'the rule is Carbon-only')
  assert.deepEqual(visibleIconNames('carbon', names, 'free'), ['home', 'logout', 'settings'])
  assert.deepEqual(visibleIconNames('carbon', names, 'anon'), ['home', 'logout', 'settings'])
  assert.deepEqual(visibleIconNames('carbon', names, undefined), ['home', 'logout', 'settings'], 'an unknown tier fails closed')
  assert.deepEqual(visibleIconNames('carbon', names, 'paid'), names)
  assert.equal(proOnlyIconCount('carbon', names), 2)
  assert.equal(canSeeIcon('carbon', 'logo-github', 'free'), false)
  assert.equal(canSeeIcon('carbon', 'logo-github', 'paid'), true)
  assert.equal(canSeeIcon('carbon', 'home', 'free'), true)
})
