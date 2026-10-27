// HOW THE ICON LIBRARY USES THE SPRITE — src/pages/IconLibrary.jsx.
//
// IconLibrary.jsx cannot be imported in Node, so these read its source (comments
// stripped) for three rules that keep the render path from writing to the page.
// They show the code is shaped this way; that the grid then draws and keeps its
// icons is pinned by tests/user-sim/164-icon-grid-sprite.spec.js and the sprite's
// own behaviour by icon-sprite.test.js.
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { test } from 'node:test'
import { stripJs as strip } from '../helpers/strip-comments.js'

const PAGE = strip(fs.readFileSync('src/pages/IconLibrary.jsx', 'utf8'))

/** From `start` to the first line that is exactly `end` (the closing brace at the same indent). */
function block(start, end) {
  const from = PAGE.indexOf(start)
  assert.ok(from >= 0, `${start} not found`)
  const to = PAGE.indexOf(end, from)
  assert.ok(to > from, `end of ${start} not found`)
  return PAGE.slice(from, to + end.length)
}

test('a ghost cell asks for no glyph source', () => {
  const renderCell = block('const renderCell = (', '\n  )\n')
  // `src` is empty whenever `ghost` is set, so a ghost never reaches the sprite or a data: URI.
  assert.match(renderCell, /src=\{!ghost && icon\.cdn && !icon\.custom && !icon\.logo \? glyphSrc\(icon\.pack, icon\.name\) : ''\}/)
  assert.equal((renderCell.match(/glyphSrc\(/g) || []).length, 1, 'glyphSrc is called from one place in renderCell')
})

test('glyphSymbolRef only reads the sprite', () => {
  const fn = block('function glyphSymbolRef(pack, name) {', '\n}\n')
  assert.match(fn, /symbolRef\(svgKey\(pack, name\)\)/)
  assert.doesNotMatch(fn, /register|touch|append|insert/i, 'a render-time lookup must not write')
})

test('the sprite is written from the batch outcome and nowhere in a render', () => {
  const calls = [...PAGE.matchAll(/registerSymbols\w*\(/g)]
  assert.equal(calls.length, 1, 'one place registers symbols')
  const writer = block('async function registerGlyphSymbols', '\n}\n')
  assert.match(writer, /registerSymbolsSliced\(/)
  // ...and its one caller is the batch loader, which runs before the answer is reported.
  assert.equal((PAGE.match(/registerGlyphSymbols\(/g) || []).length, 2, 'the definition and one call')
  assert.match(block('async function loadGlyphBatchOutcome', '\n}\n'), /await registerGlyphSymbols\(pack, names\)/)
  // The import is the only other mention; the render helpers use `symbolRef` and `touchSymbol` only.
  assert.match(PAGE, /import \{ registerSymbolsSliced, symbolRef, touchSymbol \} from '\.\.\/utils\/iconSprite'/)
})

test('a sprite cell is marked as used once per mount, not on every render', () => {
  const cell = block('function SpriteGlyph(', '\n}\n')
  assert.match(cell, /useEffect\(\(\) => \{ touchSymbol\(symKey\) \}, \[symKey\]\)/)
})
