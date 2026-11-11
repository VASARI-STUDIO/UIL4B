// VISIBLE COPY SAYS "UI L4B", WITH A SPACE.
//
// Every locale file is read as data and each string VALUE is checked. Keys,
// code and URLs are not locale values, so "UIL4B" in those would not trip this.
// The unspaced "UIL4B" stays only where a screen reader needs it said as one
// word (aria-label, sr-only), and none of that lives in the locale files.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'

const DIR = 'src/locales'
const FILES = readdirSync(DIR).filter((f) => f.endsWith('.json'))

function* values(node, trail = '') {
  if (typeof node === 'string') yield [trail, node]
  else if (node && typeof node === 'object') {
    for (const [k, v] of Object.entries(node)) yield* values(v, trail ? `${trail}.${k}` : k)
  }
}

test('the locale folder has locale files to check', () => {
  assert.ok(FILES.length >= 10, `expected the ten locale files, found ${FILES.length}`)
})

for (const file of FILES) {
  test(`${file} has no visible "UIL4B" in any value`, () => {
    const json = JSON.parse(readFileSync(path.join(DIR, file), 'utf8'))
    const hits = [...values(json)].filter(([, v]) => /UIL4B/.test(v)).map(([k]) => k)
    assert.deepEqual(hits, [], `write "UI L4B" in: ${hits.join(', ')}`)
  })
}

test('the checker can see a hit: a value spelt "UIL4B" is caught', () => {
  const hits = [...values({ a: { b: 'Log in to UIL4B' }, c: 'UI L4B' })]
    .filter(([, v]) => /UIL4B/.test(v))
  assert.deepEqual(hits, [['a.b', 'Log in to UIL4B']])
})
