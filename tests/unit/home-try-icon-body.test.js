// THE ICON TOOL DRAWS THIRD-PARTY SVG INLINE, SO ONLY PLAIN PATHS MAY PASS.
//
// Each test names the mutation that makes it fail.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { safeBody } from '../../src/components/home/try/iconBody.js'
import { KERBSIDE_BODIES } from '../../src/components/home/try/kerbsideIcons.js'

test('the held Kerbside drawings all pass unchanged', () => {
  // Mutation: tighten DRAWING or PATH in iconBody.js so a held body is refused.
  for (const [name, body] of Object.entries(KERBSIDE_BODIES)) {
    assert.equal(safeBody(body), body, name)
  }
})

test('Iconify bold, fill and duotone shapes pass and are rebuilt as plain paths', () => {
  // Mutation: drop the WRAPPER handling, or let the fill attribute through into the output.
  assert.equal(safeBody('<path fill="currentColor" d="M1 2h3Z"/>'), '<path d="M1 2h3Z"/>')
  assert.equal(
    safeBody('<g fill="currentColor"><path d="M1 2h3Z" opacity=".2"/><path d="M4 5l6 7"/></g>'),
    '<path d="M1 2h3Z" opacity=".2"/><path d="M4 5l6 7"/>',
  )
})

test('anything but paths is refused', () => {
  // Mutation: let any tag, attribute or leftover text through.
  const bad = [
    '<script>alert(1)</script>',
    '<path d="M1 2h3Z"/><script>alert(1)</script>',
    '<path d="M1 2h3Z" onload="x()"/>',
    '<path d="M1 2h3Z" fill="#f00"/>',
    '<path d="M1 2h3Z" style="x"/>',
    '<path d="M1 2h3Z"/>text',
    '<image href="https://example.com/x.png"/>',
    '<g fill="currentColor"><use href="#a"/></g>',
    '<path d="M1 2 <b>"/>',
    '<path d="url(x)"/>',
    '<path opacity=".2"/>',
    '<path d="M1 2h3Z" opacity="9999"/>',
    '',
    null,
  ]
  for (const body of bad) assert.equal(safeBody(body), '', String(body))
})
