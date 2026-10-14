// The billing intervals are written in several places. They must be one list.
//   server allowlist   api/_lib/pricing.js#BILLING_INTERVALS
//   client allowlist   the Set in src/contexts/SubscriptionContext.jsx
//   plan ladder        the checkoutPlan of every rung in src/config/planLadder.js
//   checkout page      the keys of PLANS in src/pages/Checkout.jsx
// and every server table keyed by interval holds exactly the sold intervals.
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import {
  BILLING_INTERVALS, DEFAULT_PRICES, LOOKUP_KEYS, PRICE_ENV_KEYS, INTERVAL_MAP, INTERVAL_COUNTS, TRIAL_DAYS,
} from '../../api/_lib/pricing.js'
import { PLAN_LADDER } from '../../src/config/planLadder.js'

const read = (f) => fs.readFileSync(path.join(process.cwd(), f), 'utf8')
const stripLineComments = (s) => s.replace(/^\s*\/\/.*$/gm, '')
const sorted = (list) => [...list].sort()

test('the client allowlist is the server allowlist', () => {
  const src = stripLineComments(read('src/contexts/SubscriptionContext.jsx'))
  const match = /const BILLING_INTERVALS = new Set\(\[([^\]]*)\]\)/.exec(src)
  assert.ok(match, 'the client Set of billing intervals was not found')
  const client = [...match[1].matchAll(/'([a-z]+)'/g)].map((m) => m[1])
  assert.deepEqual(sorted(client), sorted(BILLING_INTERVALS))
})

test('the ladder offers exactly the intervals the server sells', () => {
  const offered = PLAN_LADDER.filter((p) => p.checkoutPlan).map((p) => p.checkoutPlan)
  assert.deepEqual(sorted(offered), sorted(BILLING_INTERVALS))
  assert.deepEqual(sorted(PLAN_LADDER.map((p) => p.liveKey)), sorted(BILLING_INTERVALS), 'a ladder rung is not sold')
})

test('every Checkout PLANS key is in the ladder', () => {
  const src = stripLineComments(read('src/pages/Checkout.jsx'))
  // \r?\n: a Windows checkout has CRLF line ends, and a bare \n made this read nothing.
  const block = /const PLANS = \{([\s\S]*?)\r?\n\}\r?\n/.exec(src)
  assert.ok(block, 'the Checkout PLANS table was not found')
  const keys = [...block[1].matchAll(/^ {2}([a-z]+): \{/gm)].map((m) => m[1])
  assert.ok(keys.length > 0, 'no PLANS keys were read')
  const ladder = PLAN_LADDER.map((p) => p.checkoutPlan).filter(Boolean)
  for (const key of keys) assert.ok(ladder.includes(key), `Checkout PLANS has "${key}", which the ladder does not offer`)
  assert.deepEqual(sorted(keys), sorted(ladder))
})

test('every interval-keyed server table holds exactly the sold intervals', () => {
  const tables = { DEFAULT_PRICES, LOOKUP_KEYS, PRICE_ENV_KEYS, INTERVAL_MAP, INTERVAL_COUNTS, TRIAL_DAYS }
  for (const [name, table] of Object.entries(tables)) {
    assert.deepEqual(sorted(Object.keys(table)), sorted(BILLING_INTERVALS), `${name} drifted from BILLING_INTERVALS`)
  }
})

test('quarterly is not sold', () => {
  assert.ok(!BILLING_INTERVALS.includes('quarterly'))
  assert.ok(!PLAN_LADDER.some((p) => p.id === 'quarterly' || p.checkoutPlan === 'quarterly'))
})
