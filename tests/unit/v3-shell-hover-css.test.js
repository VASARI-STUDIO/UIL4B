// The V3 shell's hover colours belong to devices that hover. On a touch screen a
// tap leaves :hover stuck on the row it touched, so every :hover rule in the
// shell stylesheet has to sit inside @media(hover:hover). This reads the rules.
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { test } from 'node:test'

// Line endings are normalised so the read works on a CRLF checkout; comments are dropped.
const css = fs.readFileSync('src/styles/v3-shell.css', 'utf8').replace(/\r\n/g, '\n').replace(/\/\*[\s\S]*?\*\//g, '')

// Remove every @media(hover:hover){ ... } block, counting braces so nested rules go with it.
function withoutHoverBlocks(text) {
  let out = ''
  let i = 0
  const open = /@media\s*\(\s*hover\s*:\s*hover\s*\)\s*\{/g
  for (;;) {
    open.lastIndex = i
    const m = open.exec(text)
    if (!m) { out += text.slice(i); break }
    out += text.slice(i, m.index)
    let depth = 1
    let j = m.index + m[0].length
    while (j < text.length && depth > 0) {
      if (text[j] === '{') depth += 1
      else if (text[j] === '}') depth -= 1
      j += 1
    }
    i = j
  }
  return out
}

test('positive control: the shell stylesheet has hover rules inside (hover:hover)', () => {
  const inside = css.length - withoutHoverBlocks(css).length
  assert.ok(inside > 500, `only ${inside} characters sit inside (hover:hover) blocks`)
})

test('no :hover selector sits outside @media(hover:hover)', () => {
  const rest = withoutHoverBlocks(css)
  const bare = rest.split('}').map((r) => r.trim()).filter((r) => /:hover/.test(r.split('{')[0]))
  assert.deepEqual(bare.map((r) => r.split('{')[0].trim()), [])
})

test('a selected theme segment is a raised chip with a ring edge, not a washed fill', () => {
  const rule = css.split('\n').find((l) => l.includes('.theme-seg :is([aria-checked="true"]'))
  assert.ok(rule, 'selected segment rule found')
  assert.match(rule, /background:var\(--v3-raised\)/)
  assert.match(rule, /box-shadow:inset 0 0 0 1px var\(--v3-ring\)/)
})
