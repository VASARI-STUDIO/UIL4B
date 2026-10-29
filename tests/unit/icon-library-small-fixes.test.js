// The icon cell animates named properties only, and the copy changed for the
// icon library's gate and save picker carries no em dash.
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { ICON_GATE_COPY } from '../../src/data/iconPackTiers.js'

const css = fs.readFileSync('src/styles/global.css', 'utf8')

test('.ic never uses transition: all', () => {
  const rules = [...css.matchAll(/(^|\})\s*(\.ic)\s*\{([^}]*)\}/g)]
  assert.ok(rules.length > 0, 'the .ic rule was not found, so this would check nothing')
  for (const [, , , body] of rules) {
    assert.doesNotMatch(body, /transition\s*:\s*all\b/, '.ic transitions named properties')
  }
})

test('no em dash in the gate copy or the save picker line', () => {
  const gate = [
    ICON_GATE_COPY.end.anon.heading, ICON_GATE_COPY.end.anon.body(65, 5, 7),
    ICON_GATE_COPY.end.anon.action, ICON_GATE_COPY.end.anon.secondary, ICON_GATE_COPY.end.anon.chip,
  ].join(' ')
  assert.doesNotMatch(gate, /\u2014/)
  const page = fs.readFileSync('src/pages/IconLibrary.jsx', 'utf8')
  const line = page.split('\n').find((l) => l.includes('Pick where this icon lives'))
  assert.ok(line, 'the save picker line moved')
  assert.doesNotMatch(line, /\u2014/)
})
