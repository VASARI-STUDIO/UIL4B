// The Pro button on the workspace and the project page prints the LIVE price
// in the visitor's own currency, or no amount at all. It never prints the USD
// fallback ladder's figure as if it were theirs (an Australian reads "$4" as A$4).
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { upgradeOffer } from '../../src/components/userhome/workspace.js'

const LIVE = {
  monthly: { usd: 4.99, aud: 6.99 },
  quarterly: { usd: 13 },
  yearly: { usd: 48, aud: 59 },
}

test('live AUD prices print the cheapest per-month figure with the A$ label', () => {
  const offer = upgradeOffer({ prices: LIVE, currency: 'aud', loaded: true })
  assert.equal(offer.label, 'Upgrade for A$4.92/mo')
  assert.equal(offer.billed, 'Billed yearly')
  assert.doesNotMatch(offer.label, /(^|[^A-Za-z])\$/, 'a bare $ is read as the visitor\'s own currency')
})

test('only a monthly price live: it is the cheapest on offer, billed monthly', () => {
  const offer = upgradeOffer({ prices: { monthly: { aud: 6.99 } }, currency: 'aud', loaded: true })
  assert.equal(offer.label, 'Upgrade for A$6.99/mo')
  assert.equal(offer.billed, 'Billed monthly')
})

test('no prices, or prices not loaded: no amount and no billed line', () => {
  for (const args of [
    { prices: null, currency: 'aud', loaded: true },
    { prices: undefined, currency: 'aud', loaded: false },
    { prices: LIVE, currency: 'aud', loaded: false },
    {},
  ]) {
    const offer = upgradeOffer(args)
    assert.equal(offer.label, 'See Pro')
    assert.equal(offer.billed, '')
    assert.doesNotMatch(offer.label, /\d/)
  }
})

test('prices only in USD while the visitor is on AUD: no amount, never the USD figure', () => {
  const offer = upgradeOffer({ prices: { monthly: { usd: 4.99 }, yearly: { usd: 48 } }, currency: 'aud', loaded: true })
  assert.equal(offer.label, 'See Pro')
  assert.equal(offer.billed, '')
})

test('the two upgrade surfaces read the live price and no longer import the frozen label', () => {
  const read = (p) => fs.readFileSync(path.join(process.cwd(), p), 'utf8')
  for (const file of ['src/components/userhome/ProPanel.jsx', 'src/pages/ProjectDetail.jsx']) {
    const src = read(file)
    assert.match(src, /upgradeOffer\(/, `${file} does not use upgradeOffer`)
    assert.match(src, /usePrices/, `${file} does not read the live prices`)
    assert.doesNotMatch(src, /\bUPGRADE\b(?!_LINE)/, `${file} still reads the static UPGRADE`)
  }
  assert.doesNotMatch(read('src/components/userhome/workspace.js'), /resolvePlanLadder|cheapestPerMonth/,
    'workspace.js is back on the USD fallback ladder')
})
