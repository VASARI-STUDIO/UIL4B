// The words the Palette Builder preview scenes print.
//
// The scenes belong to one invented product, Fernway. A preview that names
// this site, a real person, a real place's Country, or a stock-text company
// would be a claim the site never made, so the copy is held to a short list
// of things it must not contain. Comments are stripped first: the files
// explain the rule in prose, and a check that matches its own documentation
// proves nothing.
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { stripJs } from '../helpers/strip-comments.js'

const EXAMPLES_DIR = 'src/components/palette/examples'
// The examples are read by folder, so a new one is covered the day it is added.
const exampleFiles = fs.readdirSync(path.join(process.cwd(), EXAMPLES_DIR))
  .filter((f) => /\.jsx$|\.data\.js$/.test(f))
  .map((f) => `${EXAMPLES_DIR}/${f}`)

// [file, shortest stripped length it may read back as]. An example is smaller
// than the Fernway scenes, so its floor is lower; it is still a guard against a
// file that was emptied or moved, which would pass the banned-word check on nothing.
const FILES = [
  ['src/data/palettePreviewScenes.js', 1000],
  ['src/components/palette/PalettePreview.jsx', 1000],
  ...exampleFiles.map((f) => [f, 300]),
]

const read = (rel) => stripJs(fs.readFileSync(path.join(process.cwd(), rel), 'utf8'))

const BANNED = [
  ['UIL4B', /uil4b/i],
  ['@uil4b', /@uil4b/i],
  ['Country', /\bcountry\b/i],
  ['Lorem', /\blorem\b/i],
  ['John', /\bjohn\b/i],
  ['Acme', /\bacme\b/i],
  ['an em dash', /—|&mdash;|&#8212;/i],
]

for (const [file, minLength] of FILES) {
  test(`${file} prints none of the banned words or an em dash`, () => {
    const code = read(file)
    assert.ok(code.length > minLength, `${file} read back almost empty (${code.length} chars)`)
    const hits = []
    code.split('\n').forEach((line, i) => {
      for (const [label, re] of BANNED) {
        if (re.test(line)) hits.push(`${file}:${i + 1} has ${label}: ${line.trim().slice(0, 100)}`)
      }
    })
    assert.deepEqual(hits, [])
  })
}

test('the banned-word check can see a hit: each pattern matches a sample line', () => {
  const samples = {
    'UIL4B': 'Welcome to UIL4B',
    '@uil4b': 'Follow @uil4b',
    'Country': 'Grown on Yugambeh Country.',
    'Lorem': 'Lorem ipsum dolor',
    'John': 'John Smith',
    'Acme': 'Acme Pty Ltd',
    'an em dash': 'Vol. 04 — Colour',
  }
  for (const [label, re] of BANNED) {
    assert.ok(re.test(samples[label]), `the ${label} pattern no longer matches its own sample`)
  }
})

test('the scene content still carries the Fernway sample data it is meant to protect', () => {
  // If the data file were emptied or moved, the two checks above would pass on
  // nothing. Read it back and require the product name and the twelve scenes.
  const data = read('src/data/palettePreviewScenes.js')
  assert.match(data, /Fernway/)
  assert.equal((data.match(/\bfree: (?:true|false)\b/g) || []).length, 12, 'expected twelve scene entries')
})
