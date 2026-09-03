// Reading a .jsx module as TEXT, for the facts Node cannot import.
//
// Several assertions in this suite have to read source rather than import it —
// CreateTool.jsx's LIVE_TOOLS is a map of React components, App.jsx's
// /create/color intercept is JSX, and a `const` inside a module is not
// reachable from outside it. #332 established the rule for that: strip the
// comments first, because a test that passes because a COMMENT still names the
// old value is not an assertion. It has happened here twice.
//
// This lived as a copied function in search-index.test.js and was about to be
// copied a third time. Three copies of the thing that decides whether the other
// assertions can be trusted is the same defect the tool lists had, one level
// down, so it is one function now. Every caller still asserts it works before
// relying on it — see `assertStripperWorks`.
import fs from 'node:fs'
import path from 'node:path'

/** Read a repo-relative file. */
export const read = (p) => fs.readFileSync(path.join(process.cwd(), p), 'utf8')

/** Strip // and block comments, leaving string and template literals alone. */
export function stripComments(src) {
  let out = ''
  let mode = 'code'
  let i = 0
  while (i < src.length) {
    const c = src[i]
    const next = src[i + 1]
    if (mode === 'code') {
      if (c === '/' && next === '/') { mode = 'line'; i += 2; continue }
      if (c === '/' && next === '*') { mode = 'block'; i += 2; continue }
      if (c === "'") mode = 'single'
      else if (c === '"') mode = 'double'
      else if (c === '`') mode = 'template'
      out += c; i += 1; continue
    }
    if (mode === 'line') {
      if (c === '\n') { mode = 'code'; out += c }
      i += 1; continue
    }
    if (mode === 'block') {
      if (c === '*' && next === '/') { mode = 'code'; i += 2 } else i += 1
      continue
    }
    if (c === '\\') { out += c + (next || ''); i += 2; continue }
    if ((mode === 'single' && c === "'") || (mode === 'double' && c === '"') || (mode === 'template' && c === '`')) {
      mode = 'code'
    }
    out += c; i += 1
  }
  return out
}

/**
 * The stripper checked on a fixture, both ways round.
 *
 * A stripper that removed nothing would let a comment satisfy every assertion
 * built on it; one that ate code would make a real regression invisible. Called
 * from each test file that reads source, so the guard travels with the use.
 */
export function assertStripperWorks(assert) {
  const fixture = "const a = 1 // note\nconst b = 'http://x//y' /* block */\nconst c = `t // t`\n"
  const stripped = stripComments(fixture)
  assert.ok(!stripped.includes('note'), 'a line comment survived')
  assert.ok(!stripped.includes('block'), 'a block comment survived')
  assert.ok(stripped.includes("'http://x//y'"), 'a // inside a string was eaten')
  assert.ok(stripped.includes('`t // t`'), 'a // inside a template was eaten')
}

/**
 * The text of a top-level array literal, comments stripped.
 *
 * Used to assert what a table may NOT say — a source read scoped to one
 * declaration, so `/create/` appearing legitimately elsewhere in the same file
 * cannot satisfy or defeat the assertion.
 */
export function arrayBlock(file, declaration) {
  const src = read(file)
  const start = src.indexOf(`const ${declaration} = [`)
  if (start === -1) throw new Error(`${file} no longer declares ${declaration}`)
  const end = src.indexOf('\n]', start)
  if (end === -1) throw new Error(`could not find the end of ${declaration} in ${file}`)
  return stripComments(src.slice(start, end))
}
