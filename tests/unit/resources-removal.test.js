import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { DISCOVER_GROUPS, NAV_SECTIONS } from '../../src/data/toolTree.js'
import { LEGACY_REDIRECTS } from '../../src/data/legacyRoutes.js'
import { buildRedirects } from '../../scripts/sync-vercel-rewrites.mjs'
import { prerenderRoutes } from '../../scripts/route-matrix.mjs'

test('the retired Resources page redirects permanently and leaves the Discover tree', async () => {
  const route = '/discover/resources'
  const config = JSON.parse(await readFile(new URL('../../vercel.json', import.meta.url), 'utf8'))
  const redirect = config.redirects.find(row => row.source === route)
  assert.deepEqual(redirect, { source: route, destination: '/discover', statusCode: 301 })
  assert.deepEqual(buildRedirects().find(row => row.source === route), redirect)
  assert.ok(LEGACY_REDIRECTS.some(([from, to]) => from === route && to === '/discover'))
  assert.ok(!DISCOVER_GROUPS.some(row => row.route === route || row.id === 'curated'))
  assert.ok(!NAV_SECTIONS.find(row => row.id === 'discover').columns.flatMap(column => column.flatMap(group => group.tools)).some(row => row.route === route))
  assert.ok(!prerenderRoutes().includes(route))
  assert.ok(!config.rewrites.some(row => row.source === route))
  assert.equal(config.redirects.find(row => row.source === '/resources').destination, '/discover')
})
