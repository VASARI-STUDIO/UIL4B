// "Where each colour lands" lists a role as in use when an element carries it in
// data-role. Each example exports ROLES, the roles it says it paints; this scans
// its source for the data-role it really sets and requires the two to agree:
//   - a role in ROLES with no tag would show a lit chip that highlights nothing;
//   - a tag outside ROLES would light a chip the example claims not to use.
// Source scan, not a render: a tag is found as a data-role="..." literal in the
// .jsx, or as a role: '...' (or the SWATCH_ROLES list) in the .data.js that the
// .jsx reads its tags from. Comments are stripped first.
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { stripJs } from '../helpers/strip-comments.js'

const DIR = path.join(process.cwd(), 'src/components/palette/examples')
const KNOWN = new Set(['primary', 'secondary', 'accent', 'subtle', 'deep', 'success', 'warning', 'error', 'info', 'neutral'])

const examples = fs.readdirSync(DIR).filter((f) => f.endsWith('.data.js')).map((f) => f.replace(/\.data\.js$/, ''))
const read = (file) => stripJs(fs.readFileSync(path.join(DIR, file), 'utf8'))

/** Every role an example's source tags, split on spaces (data-role="primary success"). */
function taggedRoles(name) {
  const jsx = read(`${name}.jsx`)
  const data = read(`${name}.data.js`)
  const found = new Set()
  const add = (s) => s.split(/\s+/).filter(Boolean).forEach((r) => found.add(r))
  for (const m of jsx.matchAll(/data-role="([^"]+)"/g)) add(m[1])
  for (const m of `${jsx}\n${data}`.matchAll(/\brole: '([a-z ]+)'/g)) add(m[1])
  for (const m of data.matchAll(/SWATCH_ROLES = \[([^\]]*)\]/g)) for (const r of m[1].matchAll(/'([a-z]+)'/g)) add(r[1])
  return found
}

test('there are examples to scan', () => {
  assert.ok(examples.length >= 3, `found ${examples.join(', ')}`)
})

for (const name of examples) {
  test(`${name}: the roles it tags are the roles in its ROLES`, async () => {
    const { ROLES } = await import(pathToFileURL(path.join(DIR, `${name}.data.js`)).href)
    assert.ok(Array.isArray(ROLES) && ROLES.length > 0, `${name}.data.js exports no ROLES`)
    for (const r of ROLES) assert.ok(KNOWN.has(r), `${name}: ROLES has "${r}", which is not a role`)
    const tagged = taggedRoles(name)
    for (const r of tagged) assert.ok(KNOWN.has(r), `${name}: tags "${r}", which is not a role`)
    const missing = ROLES.filter((r) => !tagged.has(r))
    const extra = [...tagged].filter((r) => !ROLES.includes(r))
    assert.deepEqual(missing, [], `${name}: ROLES lists roles with no data-role in the source`)
    assert.deepEqual(extra, [], `${name}: tags roles that ROLES does not list`)
  })
}

test('the scan can see a miss: a source with no tag for a listed role is reported', () => {
  const tagged = new Set(['primary', 'neutral'])
  assert.deepEqual(['primary', 'accent'].filter((r) => !tagged.has(r)), ['accent'])
})
