// Icon Library grid — appending a page renders the new cells, not every cell.
//
// The grid grows by infinite scroll to thousands of cells. Each cell is a
// memoised `IconCell`, so a new page, a tranche of glyph markup or the
// customizer opening re-runs only the cells whose own props changed. That only
// holds while every prop the grid passes is a primitive, the icon object or a
// stable callback: one inline arrow in the grid's `<IconCell … />` hands every
// cell a new function on every render and quietly re-renders all of them.
//
// Cells far above the viewport are windowed down to a "ghost" — the same
// focusable element at its measured height, keeping its name. The pins below
// keep the ghost the same element (so focus survives the swap), keep its name
// in the DOM (so find-in-page can still reach it) and keep the focused cell out
// of the window.
//
// Source-reading on purpose: the runtime numbers live in the scroll-lag
// measurement; this is the guard that a refactor did not undo the structure.
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const raw = readFileSync(new URL('../../src/pages/IconLibrary.jsx', import.meta.url), 'utf8')
// Comments explain the code here at length; assert only on the code.
const src = raw
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/(^|[^:'"`\\])\/\/.*$/gm, '$1')

const block = (start, end) => {
  const i = src.indexOf(start)
  assert.ok(i >= 0, `missing: ${start}`)
  const j = src.indexOf(end, i + start.length)
  assert.ok(j > i, `unterminated: ${start}`)
  return src.slice(i, j + end.length)
}

test('the grid cell is a memoised component', () => {
  assert.match(src, /const IconCell = memo\(function IconCell\(/)
})

test('the grid hands each cell only stable props (no inline callbacks)', () => {
  const cell = block('<IconCell', '/>')
  assert.doesNotMatch(cell, /=>/, 'an inline arrow in <IconCell … /> re-renders every cell on every grid render')
  assert.doesNotMatch(cell, /\.bind\(/, 'a bound function is a new prop every render')
  for (const p of ['onPick', 'onWarm']) {
    assert.match(cell, new RegExp(`${p}=\\{${p}\\}`), `${p} is passed by reference`)
    assert.match(src, new RegExp(`const ${p} = useCallback\\(`), `${p} is a stable useCallback`)
  }
  assert.match(src, /const onPick = useCallback\([^\n]*, \[\]\)/, 'onPick never changes identity')
})

test('a windowed cell is the same element, still focusable, still named', () => {
  // Every grid cell goes through renderCell → IconCell; no separate ghost element.
  assert.match(src, /list\.map\(\(icon, idx\) => renderCell\(icon, idx, showPack, /)
  assert.doesNotMatch(src, /className="ig-ghost"/)
  const body = block('const IconCell = memo(function IconCell(', '\n})')
  assert.match(body, /tabIndex=\{0\}/)
  assert.match(body, /role="button"/)
  // The name is rendered unconditionally — ghost or not — so find-in-page finds it.
  assert.match(body, /\n\s*<span key="n">\{icon\.name\}<\/span>/)
})

test('the focused cell is never windowed out', () => {
  assert.match(src, /grid\.contains\(document\.activeElement\)/)
  assert.match(src, /const keep = focused >= 0 && focused < upTo \? focused : -1/)
  assert.match(src, /idx < ghosts\.upTo && idx !== ghosts\.keep \? ghosts\.h\[idx\] : 0/)
  // Focus entering a ghost has to re-run the window so that cell is kept whole.
  assert.match(src, /grid\.addEventListener\('focusin', schedule\)/)
})

test('cells above the focused one are still windowed', () => {
  // Capping the window at the focused cell left every cell whole once cell 0
  // had been clicked: the DOM never shrank.
  assert.doesNotMatch(src, /upTo = Math\.min\(upTo, focused/)
})
