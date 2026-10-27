import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { colourRowState } from '../../src/utils/iconColourRow.js'
import { stripJs } from '../helpers/strip-comments.js'

const MULTI = '<svg><path fill="#123456"/><path fill="#abcdef"/></svg>'
const GRADIENT = '<svg><defs><linearGradient id="a"/></defs><path fill="url(#a)"/></svg>'
const SINGLE = '<svg><path fill="#161614"/></svg>'

test('a one-colour logo in a coloured pack gets the colour choice', () => {
  assert.deepEqual(colourRowState({ inColouredPack: true, svg: SINGLE }), { coloured: false, row: 'choose' })
})

test('multi-colour and gradient art read "Original colours"', () => {
  assert.deepEqual(colourRowState({ inColouredPack: true, svg: MULTI }), { coloured: true, row: 'original' })
  assert.deepEqual(colourRowState({ inColouredPack: true, svg: GRADIENT }), { coloured: true, row: 'original' })
})

test('an icon outside the coloured packs always gets the choice, whatever its markup', () => {
  for (const svg of [SINGLE, MULTI, '']) {
    assert.deepEqual(colourRowState({ inColouredPack: false, svg }), { coloured: false, row: 'choose' })
  }
})

test('the "Original colours" text is a plain value, never a Default pill', () => {
  const jsx = stripJs(readFileSync(new URL('../../src/pages/IconLibrary.jsx', import.meta.url), 'utf8'))
  assert.match(jsx, /colourRow === 'original' \? \(\s*<span className="icust-value">Original colours<\/span>/)
  assert.doesNotMatch(jsx, /icust-seg-static/)
  assert.doesNotMatch(jsx, /icust-note/)
})
