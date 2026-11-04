// Only main deploys on Vercel. Every push to another branch used to create a
// preview deployment, and on the Hobby plan those share the daily limit with
// production, so a busy day of pull requests could stop main going live.
// Vercel deploys a branch when ANY matching rule is true, so "**": false turns
// off every other branch and "main": true keeps production on.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const config = JSON.parse(readFileSync(new URL('../../vercel.json', import.meta.url), 'utf8'))
const rules = config.git?.deploymentEnabled

test('main always deploys', () => {
  assert.equal(typeof rules, 'object', 'git.deploymentEnabled must be a branch map, not a single switch')
  assert.equal(rules.main, true, 'main must stay on, or production stops deploying')
})

test('every other branch is off, and no other rule turns one back on', () => {
  assert.equal(rules['**'], false, 'branches other than main must not create preview deployments')
  const on = Object.entries(rules).filter(([, v]) => v === true).map(([k]) => k)
  assert.deepEqual(on, ['main'], `only main may be true; also true: ${on.filter((k) => k !== 'main').join(', ')}`)
})
